package handlers

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

type githubRepo struct {
	ID            int64     `json:"id"`
	Name          string    `json:"name"`
	FullName      string    `json:"full_name"`
	Private       bool      `json:"private"`
	HTMLURL       string    `json:"html_url"`
	DefaultBranch string    `json:"default_branch"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func GetGitHubRepos(db *sql.DB) gin.HandlerFunc {
	client := &http.Client{Timeout: 30 * time.Second}
	return func(c *gin.Context) {
		var encryptedToken sql.NullString
		if err := db.QueryRowContext(c.Request.Context(), "SELECT github_access_token FROM users WHERE id = $1", c.GetString("userID")).Scan(&encryptedToken); err != nil && err != sql.ErrNoRows {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not load GitHub account"})
			return
		}
		if !encryptedToken.Valid || encryptedToken.String == "" {
			c.JSON(http.StatusBadRequest, gin.H{"detail": "No GitHub account connected"})
			return
		}

		token, err := decryptFernet(encryptedToken.String, os.Getenv("ENCRYPTION_KEY"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not decrypt GitHub account"})
			return
		}
		req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner", nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"detail": "Could not prepare GitHub request"})
			return
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Accept", "application/vnd.github+json")
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"detail": "Failed to fetch repos from GitHub"})
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			_, _ = io.Copy(io.Discard, resp.Body)
			c.JSON(http.StatusBadGateway, gin.H{"detail": "Failed to fetch repos from GitHub"})
			return
		}

		var repos []githubRepo
		if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"detail": "Failed to read repos from GitHub"})
			return
		}
		projects := make([]gin.H, 0, len(repos))
		for _, repo := range repos {
			projects = append(projects, gin.H{"id": repo.ID, "name": repo.Name, "full_name": repo.FullName, "private": repo.Private, "url": repo.HTMLURL, "default_branch": repo.DefaultBranch, "updated_at": repo.UpdatedAt})
		}
		c.JSON(http.StatusOK, gin.H{"projects": projects})
	}
}

// GitHub tokens were encrypted by Python's Fernet helper, so Go must preserve that wire format.
func decryptFernet(token, encodedKey string) (string, error) {
	key, err := base64.URLEncoding.DecodeString(encodedKey)
	if err != nil || len(key) != 32 {
		return "", errors.New("invalid Fernet key")
	}
	data, err := base64.URLEncoding.DecodeString(token)
	if err != nil || len(data) < 1+8+aes.BlockSize+sha256.Size || data[0] != 0x80 {
		return "", errors.New("invalid Fernet token")
	}
	message, signature := data[:len(data)-sha256.Size], data[len(data)-sha256.Size:]
	mac := hmac.New(sha256.New, key[:16])
	_, _ = mac.Write(message)
	if !hmac.Equal(signature, mac.Sum(nil)) {
		return "", errors.New("invalid Fernet signature")
	}
	iv, ciphertext := data[9:9+aes.BlockSize], data[9+aes.BlockSize:len(data)-sha256.Size]
	if len(ciphertext) == 0 || len(ciphertext)%aes.BlockSize != 0 {
		return "", errors.New("invalid Fernet ciphertext")
	}
	block, err := aes.NewCipher(key[16:])
	if err != nil {
		return "", err
	}
	plaintext := make([]byte, len(ciphertext))
	cipher.NewCBCDecrypter(block, iv).CryptBlocks(plaintext, ciphertext)
	padding := int(plaintext[len(plaintext)-1])
	if padding == 0 || padding > aes.BlockSize || padding > len(plaintext) {
		return "", errors.New("invalid Fernet padding")
	}
	for _, b := range plaintext[len(plaintext)-padding:] {
		if int(b) != padding {
			return "", errors.New("invalid Fernet padding")
		}
	}
	return string(plaintext[:len(plaintext)-padding]), nil
}
