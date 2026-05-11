export default function handler(req, res) {
  const client_id = process.env.OAUTH_GITHUB_CLIENT_ID;
  
  // Decap CMS requires the 'repo' and 'user' scopes
  const scope = "repo,user";
  
  // The URL github will send the user back to
  const redirect_uri = `https://${req.headers.host}/api/callback`;
  
  // Send the user to GitHub to log in
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}`
  );
}