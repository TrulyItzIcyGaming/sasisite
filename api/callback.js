export default async function handler(req, res) {
  const code = req.query.code;
  const client_id = process.env.OAUTH_GITHUB_CLIENT_ID;
  const client_secret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ client_id, client_secret, code }),
    });

    const data = await tokenResponse.json();
    const token = data.access_token;
    const provider = 'github';

    // This specific HTML script tells the Decap CMS window that login was successful
    const script = `
      <script>
        const receiveMessage = (message) => {
          window.opener.postMessage(
            'authorization:${provider}:success:' + JSON.stringify({ token: '${token}', provider: '${provider}' }),
            message.origin
          );
          window.removeEventListener("message", receiveMessage, false);
        }
        window.addEventListener("message", receiveMessage, false);
        
        if (window.opener) {
            window.opener.postMessage("authorizing:${provider}", "*");
        } else {
            document.write("Login successful! However, the parent window was closed. Please close this window and try again.");
        }
      </script>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(script);
  } catch (error) {
    res.status(500).send('Authentication Error');
  }
}