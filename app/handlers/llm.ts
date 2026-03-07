import { request } from "./auth";
import { API_BASE } from "./auth";

const llm_endpoint = "/llm";


export const sendMessage = async (input: string) => {
  const data = await request(`${llm_endpoint}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_input: input })
  })
  return data
}