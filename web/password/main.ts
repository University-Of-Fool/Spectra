import "./style.css";

try {
    const backend_data = JSON.parse(document.getElementById("spectra-data")!.textContent!);
    document.getElementById("path_name")!.innerHTML = backend_data.path_name;
    if (backend_data.error) {
        document.getElementById("wrong")!.innerHTML = "Wrong password! Please try again."
    }
} catch (_) {
}