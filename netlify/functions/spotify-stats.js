exports.handler = async function(event, context) {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const artist_id = process.env.SPOTIFY_ARTIST_ID || '3WTWf9VjFi4QbSoHV52VGJ';

    if (!client_id || !client_secret) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Missing Spotify credentials in environment variables.' }) 
        };
    }

    try {
        // 1. Authenticate with Spotify (Client Credentials Flow)
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                // Node 18+ has global btoa, but Buffer is safer in some serverless environments
                'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
            },
            body: 'grant_type=client_credentials'
        });
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
            throw new Error(`Token Error: ${tokenData.error_description || tokenData.error || 'Failed to authenticate'}`);
        }

        const token = tokenData.access_token;

        // 2. Fetch the specific Artist's data
        const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artist_id}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const artistData = await artistResponse.json();

        if (!artistResponse.ok) {
            throw new Error(`Spotify API limits/error: ${artistData.error?.message || 'Failed to get artist data'}`);
        }

        // 3. Return the data to our frontend
        return {
            statusCode: 200,
            body: JSON.stringify({
                followers: artistData.followers.total,
                popularity: artistData.popularity,
                genres: artistData.genres
            })
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
}