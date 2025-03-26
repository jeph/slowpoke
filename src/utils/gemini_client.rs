use reqwest::header::CONTENT_TYPE;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::from_str;
use tracing::info;

#[derive(Debug)]
pub struct GeminiClient {
  gemini_api_key: String,
  client: Client,
}

#[derive(Debug, Clone)]
pub struct GeminiPrompt {
  pub prompt: String,
  pub system_instruction: Option<String>,
}

#[derive(Debug, Clone)]
pub struct GeminiResponse {
  pub response: String,
}

impl GeminiClient {
  pub fn new(gemini_api_key: String, client: Client) -> Self {
    GeminiClient {
      gemini_api_key,
      client,
    }
  }

  pub async fn prompt(
    &self,
    prompt: GeminiPrompt,
  ) -> Result<GeminiResponse, reqwest::Error> {
    let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
            self.gemini_api_key
        );

    let system_instruction = match prompt.system_instruction {
      Some(system_instruction) => Some(SystemInstruction {
        parts: vec![Part {
          text: system_instruction,
        }],
      }),
      None => None,
    };

    let post_prompt_request = PostPromptRequest {
      system_instruction,
      contents: vec![Content {
        parts: vec![Part {
          text: prompt.prompt,
        }],
      }],
    };

    let request_json = serde_json::to_string(&post_prompt_request).unwrap();

    let response = self
      .client
      .post(url)
      .header(CONTENT_TYPE, "application/json")
      .body(request_json)
      .send()
      .await?;
    let response = &response.text().await?;
    info!(response);
    let response: PostPromptResponse = from_str(response).unwrap();

    let response = response
      .candidates
      .iter()
      .fold("".to_owned(), |acc, candidate| {
        let candidate_parts_text = candidate
          .content
          .parts
          .iter()
          .fold("".to_owned(), |acc, part| format!("{}{}", acc, part.text));
        format!("{}{}", acc, candidate_parts_text)
      });
    info!(response);

    Ok(GeminiResponse { response })
  }
}

#[derive(Serialize, Deserialize, Debug)]
struct PostPromptRequest {
  #[serde(skip_serializing_if = "Option::is_none")]
  system_instruction: Option<SystemInstruction>,
  contents: Vec<Content>,
}

#[derive(Serialize, Deserialize, Debug)]
struct PostPromptResponse {
  candidates: Vec<Candidate>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Content {
  parts: Vec<Part>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Part {
  text: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct Candidate {
  content: Content,
}

#[derive(Serialize, Deserialize, Debug)]
struct SystemInstruction {
  parts: Vec<Part>,
}
