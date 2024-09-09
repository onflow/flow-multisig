
const GET_SERVICE_ACCT_FILE_LIST = "https://api.github.com/repos/onflow/service-account/contents/templates";
const GET_SERVICE_ACCT_FILE = "https://raw.githubusercontent.com/onflow/service-account/main/templates/";
const GET_FOUNDATION_FILE_LIST = "https://api.github.com/repos/onflow/foundation/contents/templates";
const GET_FOUNDATION_FILE = "https://raw.githubusercontent.com/onflow/foundation/master/templates/";

export const getServiceAccountFileList = async () => {
    return getCadenceFilesnames(GET_SERVICE_ACCT_FILE_LIST)
}
export const getServiceAccountFilename = async (filename) => {
    return getCadenceFilename(GET_SERVICE_ACCT_FILE, filename)
}

export const getFoundationFileList = async () => {
    return getCadenceFilesnames(GET_FOUNDATION_FILE_LIST)
}
export const getFoundationFilename = async (filename) => {
    return getCadenceFilename(GET_FOUNDATION_FILE, filename)
}


const getCadenceFilesnames = async (fileList) => {
    const response = await fetch(fileList)
        .catch(e => {
            console.log(e)
        });
    const filelist = await response.json();
    return (filelist || []).map(f => f.name)
}

const getCadenceFilename = async (prepend, filename) => {
    const file = await fetch(`${prepend}${filename}`)
    const content = await file.text();
    return content;
}