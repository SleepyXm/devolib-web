Start-Job { npm run dev }

Start-Job { cd app/backend; uvicorn main:app --reload }

Get-Job | Wait-Job