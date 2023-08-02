export async function getAuthMessage(
  publicAddress: string,
  domain: string,
  uri: string
): Promise<string> {
  const query = `
    query GetAuthMessage($publicAddress: String!, $domain: String!, $uri: String!) {
      getAuthMessage(publicAddress: $publicAddress, domain: $domain, uri: $uri) {
        authMessage
      }
    }
  `;

  const variables = {
    publicAddress,
    domain,
    uri,
  };

  const response = await fetch(
    process.env.NEXT_PUBLIC_GRAPHQL_API_ENDPOINT as string,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: query,
        variables: variables,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const responseBody = await response.json();
  return responseBody.data.getAuthMessage.authMessage;
}

interface AuthenticateInput {
  publicAddress: string;
  signature: string;
  message: string;
  contracts?: string[];
}

interface AuthenticateOutput {
  jwt: string;
  expiration: number;
}

export async function getJWT(
  input: AuthenticateInput
): Promise<AuthenticateOutput> {
  const mutation = `
    mutation Authenticate($input: AuthenticateInput!) {
      authenticate(input: $input) {
        jwt
        expiration
      }
    }
  `;

  const variables = {
    input: input,
  };

  const response = await fetch(
    process.env.NEXT_PUBLIC_GRAPHQL_API_ENDPOINT as string,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: variables,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const responseBody = await response.json();
  return responseBody.data.authenticate;
}
