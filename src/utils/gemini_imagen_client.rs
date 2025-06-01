use reqwest::header::CONTENT_TYPE;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::from_str;
use tracing::info;

#[derive(Debug)]
pub struct GeminiImagenClient {
  gemini_api_key: String,
  client: Client,
}

#[derive(Debug, Clone)]
pub struct GeminiImagenPrompt {
  pub prompt: String,
}

#[derive(Debug, Clone)]
pub struct GeminiImagenResponse {
  pub base_64_image: String,
}

impl GeminiImagenClient {
  pub fn new(gemini_api_key: String, client: Client) -> Self {
    GeminiImagenClient {
      gemini_api_key,
      client,
    }
  }

  pub async fn prompt(
    &self,
    prompt: GeminiImagenPrompt,
  ) -> Result<GeminiImagenResponse, reqwest::Error> {
    info!("Prompting for image with prompt: {:#?}", prompt);
    let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key={}",
            self.gemini_api_key
        );

    let imagen_request = PostImagenPromptRequest {
      contents: vec![Content {
        parts: vec![Part {
          text: prompt.prompt,
        }],
      }],
      generation_config: GenerationConfig {
        response_modalities: vec!["TEXT".to_owned(), "IMAGE".to_owned()],
      },
    };

    let request_json = serde_json::to_string(&imagen_request).unwrap();

    let response = self
      .client
      .post(url)
      .header(CONTENT_TYPE, "application/json")
      .body(request_json)
      .send()
      .await?
      .text()
      .await?;
    info!("Got the following response: {:#?}", response);

    let response: PostImagenPromptResponse = from_str(&response).unwrap();

    let base_64_images = response.candidates[0]
      .content
      .parts
      .iter()
      .filter(|part| part.inline_data.is_some())
      .cloned()
      .collect::<Vec<ImagenPart>>();

    let base_64_image = base_64_images
      .get(0)
      .unwrap()
      .clone()
      .inline_data
      .unwrap()
      .data;

    Ok(GeminiImagenResponse { base_64_image })
  }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct PostImagenPromptRequest {
  contents: Vec<Content>,
  generation_config: GenerationConfig,
}

#[derive(Serialize, Deserialize, Debug)]
struct PostImagenPromptResponse {
  candidates: Vec<ImagenCandidate>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ImagenCandidate {
  content: ImagenContent,
}

#[derive(Serialize, Deserialize, Debug)]
struct ImagenContent {
  parts: Vec<ImagenPart>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct GenerationConfig {
  response_modalities: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct ImagenPart {
  text: Option<String>,
  inline_data: Option<ImagenInlineData>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct ImagenInlineData {
  mime_type: String,
  data: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct Part {
  text: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct Content {
  parts: Vec<Part>,
}
