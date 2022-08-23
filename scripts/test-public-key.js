import { GcpKmsAuthorizer } from "fcl-gcp-kms-authorizer";

const main = async () => {
  // Your GCP Resource Name Goes Here
  const resourceId =   'projects/my-kms-project-35857/locations/global/keyRings/test/cryptoKeys/tester002/cryptoKeyVersions/1';
  const authorizer = new GcpKmsAuthorizer(resourceId);
  const publicKey = await authorizer.getPublicKey();
  console.log('\nFetched Raw Hex Public Key: ' + publicKey);
}

main().catch(e => console.error(e));