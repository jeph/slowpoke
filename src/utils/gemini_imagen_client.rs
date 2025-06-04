use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use reqwest::header::CONTENT_TYPE;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::from_str;
use std::error::Error;
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
pub struct GeminiImagenPromptWithImage {
  pub prompt: String,
  pub image_mime_type: String,
  pub image_data: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct GeminiImagenResponse {
  pub image_data: Vec<u8>,
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
  ) -> Result<GeminiImagenResponse, Box<dyn Error + Send + Sync>> {
    info!("Prompting for image with prompt: {}", prompt.prompt);
    let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key={}",
            self.gemini_api_key
        );

    let imagen_request = PostImagenPromptRequest {
      contents: vec![ImagenContent {
        parts: vec![ImagenPart {
          text: Some(prompt.prompt),
          inline_data: None,
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

    let base64_images = response.candidates[0]
      .content
      .parts
      .iter()
      .filter(|part| part.inline_data.is_some())
      .collect::<Vec<&ImagenPartResponse>>();

    let base64_image = &base64_images
      .get(0)
      .unwrap()
      .inline_data
      .as_ref()
      .unwrap()
      .data;

    let decoded_image_data = STANDARD.decode(base64_image).unwrap();

    Ok(GeminiImagenResponse {
      image_data: decoded_image_data,
    })
  }

  pub async fn prompt_with_image(
    &self,
    prompt: GeminiImagenPromptWithImage,
  ) -> Result<GeminiImagenResponse, Box<dyn Error + Send + Sync>> {
    info!("Prompting for image with prompt: {}", prompt.prompt);
    info!(
      "Prompting for image with mime type: {}",
      prompt.image_mime_type
    );
    let url = format!(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key={}",
      self.gemini_api_key
    );

    let imagen_request = PostImagenPromptRequest {
      contents: vec![ImagenContent {
        parts: vec![
          ImagenPart {
            text: Some(prompt.prompt),
            inline_data: None,
          },
          ImagenPart {
            text: None,
            inline_data: Some(ImagenInlineData {
              mime_type: prompt.image_mime_type,
              data: STANDARD.encode(&prompt.image_data),
            }),
          },
        ],
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

    let base64_images = response.candidates[0]
      .content
      .parts
      .iter()
      .filter(|part| part.inline_data.is_some())
      .collect::<Vec<&ImagenPartResponse>>();

    let base64_image = &base64_images
      .get(0)
      .unwrap()
      .inline_data
      .as_ref()
      .unwrap()
      .data;

    let decoded_image_data = STANDARD.decode(base64_image).unwrap();

    Ok(GeminiImagenResponse {
      image_data: decoded_image_data,
    })
  }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct PostImagenPromptRequest {
  contents: Vec<ImagenContent>,
  generation_config: GenerationConfig,
}

#[derive(Serialize, Deserialize, Debug)]
struct PostImagenPromptResponse {
  candidates: Vec<ImagenCandidate>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ImagenCandidate {
  content: ImagenContentResponse,
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
struct ImagenPart {
  #[serde(skip_serializing_if = "Option::is_none")]
  text: Option<String>,

  #[serde(skip_serializing_if = "Option::is_none")]
  inline_data: Option<ImagenInlineData>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct ImagenInlineData {
  mime_type: String,
  data: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct ImagenContentResponse {
  parts: Vec<ImagenPartResponse>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct ImagenPartResponse {
  text: Option<String>,
  inline_data: Option<ImagenInlineDataResponse>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct ImagenInlineDataResponse {
  mime_type: String,
  data: String,
}
