const HEADERS = "Accept: application/vnd.github.v3+json";
const GET_FILE_LIST = "https://api.github.com/repos/onflow/service-account/contents/templates"
const GET_FILE = "https://raw.githubusercontent.com/onflow/service-account/main/templates/"

export const getCadenceFilesnames = async () => {
    const response = await fetch(GET_FILE_LIST)
        .catch(e => {
            console.log(e)
        });
    const filelist = await response.json();
    return (filelist || []).map(f => f.name)
}

export const getCadenceFilename = async (filename) => {
    const file = await fetch(`${GET_FILE}${filename}`)
    const content = await file.text();
    return content;
}