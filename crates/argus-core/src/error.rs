use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("network error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("invalid url: {0}")]
    Url(#[from] url::ParseError),
    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("bad response: {0}")]
    Json(#[from] serde_json::Error),
    #[error("source error ({source_name}): {message}")]
    Source {
        source_name: String,
        message: String,
    },
    #[error("{0}")]
    Invalid(String),
    #[error("not found: {0}")]
    NotFound(String),
}

impl Error {
    pub fn source(name: impl Into<String>, message: impl Into<String>) -> Self {
        Self::Source {
            source_name: name.into(),
            message: message.into(),
        }
    }
}

pub type Result<T, E = Error> = std::result::Result<T, E>;
