use shadow_rs::ShadowBuilder;

fn main() {
    println!("cargo:rerun-if-changed=../migrations");
    ShadowBuilder::builder().build().unwrap();
}
