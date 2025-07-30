use serde::Serialize;
use shadow_rs::{SdResult, ShadowBuilder};
use std::fs::File;
use std::io::Write;
use tokei::LanguageType;

fn main() {
    println!("cargo:rerun-if-changed=../migrations");
    ShadowBuilder::builder().hook(hook_tokei).build().unwrap();
}

fn hook_tokei(mut file: &File) -> SdResult<()> {
    // count codes at compile time
    let codes = {
        use tokei::{Config, Languages};

        #[derive(Serialize)]
        struct LanguageStat {
            language: String,
            lines: usize,
        }

        let paths = &[".", "../web/", "../scripts", "../migrations"];
        let excluded = &["target", "data", ".sqlx", "dist"];
        let output_languages = vec![
            LanguageType::Rust,
            LanguageType::JavaScript,
            LanguageType::TypeScript,
            LanguageType::Html,
            LanguageType::Jsx,
            LanguageType::Tsx,
            LanguageType::Css,
            LanguageType::Sql,
        ];
        let config = Config {
            types: Some(output_languages),
            ..Config::default()
        };
        let mut languages = Languages::new();
        languages.get_statistics(paths, excluded, &config);
        let total = languages.total().code;
        let mut codes: Vec<LanguageStat> = Vec::new();
        for (lang, stats) in languages {
            codes.push(LanguageStat {
                language: lang.to_string(),
                lines: stats.code,
            });
        }
        codes.push(LanguageStat {
            language: "Total".to_string(),
            lines: total,
        });
        &serde_json::to_string(&codes).unwrap()
    };

    writeln!(file, "pub const CODES: &str = r#\"{}\"#;", codes)?;
    Ok(())
}
