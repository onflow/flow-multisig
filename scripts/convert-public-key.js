import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Converts a PEM format public key to Flow blockchain format using Flow CLI
 * @param {string} pemKey - The PEM format public key
 * @returns {string} - The public key in Flow format (hex string)
 */
const convertPemToFlowFormat = async (pemKey) => {
    let tempFilePath = null;
    try {
        // Create a temporary file for the PEM key
        tempFilePath = path.join('/tmp', `flow-public-key-${Date.now()}.pem`);
        fs.writeFileSync(tempFilePath, pemKey);
        
        // Use Flow CLI to decode the PEM key
        const result = execSync(`flow keys decode pem --from-file "${tempFilePath}"`, { 
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Parse the output to extract the public key
        const lines = result.split('\n');
        const publicKeyLine = lines.find(line => line.includes('Public Key'));
        
        if (!publicKeyLine) {
            throw new Error('Could not find public key in Flow CLI output');
        }
        
        // Extract the hex key from the line
        const publicKeyMatch = publicKeyLine.match(/Public Key\s+([a-fA-F0-9]+)/);
        if (!publicKeyMatch) {
            throw new Error('Could not parse public key from Flow CLI output');
        }
        
        const flowPublicKey = publicKeyMatch[1].toLowerCase();
        console.log('Flow CLI conversion successful');
        
        return flowPublicKey;
    } catch (error) {
        console.error('Error converting public key with Flow CLI:', error.message);
        throw error;
    } finally {
        // Clean up temporary file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
};

/**
 * Validates that a public key is in correct PEM format using Flow CLI
 * @param {string} pemKey - The PEM format public key
 * @returns {boolean} - True if valid, false otherwise
 */
const validatePublicKey = (pemKey) => {
    let tempFilePath = null;
    try {
        // Create a temporary file for the PEM key
        tempFilePath = path.join('/tmp', `flow-validate-key-${Date.now()}.pem`);
        fs.writeFileSync(tempFilePath, pemKey);
        
        // Try to decode with Flow CLI - if it succeeds, the key is valid
        execSync(`flow keys decode pem --from-file "${tempFilePath}"`, { 
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        console.log('Key validation successful');
        return true;
    } catch (error) {
        console.error('Invalid public key format:', error.message);
        return false;
    } finally {
        // Clean up temporary file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
};

// Main execution
const main = async () => {
    // Your provided public key
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE4rxn+rVQ8JKTW1jiHbxe13YCIOOm
uGsYpi+f0SDWksz50WfABJ77qXc7ySHZetdUFFF1L8c7IBPX81v3xC4kPw==
-----END PUBLIC KEY-----`;

    console.log('Original PEM Public Key:');
    console.log(publicKeyPem);
    console.log('\n');
    
    // Validate the public key
    if (!validatePublicKey(publicKeyPem)) {
        console.error('Invalid public key provided');
        process.exit(1);
    }
    
    try {
        // Convert to Flow format
        const flowPublicKey = await convertPemToFlowFormat(publicKeyPem);
        
        console.log('Flow Blockchain Format (hex):');
        console.log(flowPublicKey);
        console.log('\n');
        
        console.log('Key Information:');
        console.log(`- Length: ${flowPublicKey.length} characters (${flowPublicKey.length/2} bytes)`);
        console.log(`- Expected length: 128 characters (64 bytes for P-256)`);
        console.log(`- Format: Uncompressed (x + y coordinates)`);
        console.log('\n');
        
        console.log('Usage for Flow account creation:');
        console.log('1. Use this hex string as the public key when creating a Flow account');
        console.log('2. Specify signature algorithm as ECDSA_P256');
        console.log('3. Specify hash algorithm as SHA2_256');
        console.log('\n');
        
        console.log('Flow CLI Account Creation:');
        console.log('Run: ./scripts/create-account-custom-key.sh');
        console.log('Or use the Flow CLI directly with the provided Cadence script');
        console.log('\n');
        
        console.log('FCL Account Creation Example:');
        console.log(`const publicKey = "${flowPublicKey}";`);
        console.log('const signatureAlgorithm = fcl.SignatureAlgorithm.ECDSA_P256;');
        console.log('const hashAlgorithm = fcl.HashAlgorithm.SHA2_256;');
        
    } catch (error) {
        console.error('Failed to convert public key:', error);
        process.exit(1);
    }
};

// Allow script to be run directly or imported
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { convertPemToFlowFormat, validatePublicKey };
