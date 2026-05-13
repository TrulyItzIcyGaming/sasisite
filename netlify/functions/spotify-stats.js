exports.handler = async function(event, context) {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const artist_id = process.env.SPOTIFY_ARTIST_ID || '3WTWf9VjFi4QbSoHV52VGJ';

    try {
        // --- 1. WEB SCRAPING FOR STATS ---
        let listeners = 0;
        let followers = 0;
        
        try {
            const htmlRes = await fetch(`https://open.spotify.com/artist/${artist_id}`);
            const html = await htmlRes.text();
            
            // Extract Monthly Listeners from meta description
            const listenerMatch = html.match(/([\d,]+)\s+monthly listeners/i);
            if (listenerMatch) {
                listeners = listenerMatch[1].replace(/,/g, '');
            }
            
            // Extract Followers from inline hydration state JSON
            const followerMatch = html.match(/"followers"\s*:\s*\{\s*"total"\s*:\s*(\d+)/i);
            if (followerMatch) {
                followers = followerMatch[1];
            }
        } catch (e) {
            console.error("Scraping failed:", e);
        }

        // --- 2. API CALL FOR RELEASES ---
        let releases = [];
        if (client_id && client_secret) {
            const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
                },
                body: 'grant_type=client_credentials'
            });
            
            if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                const token = tokenData.access_token;

                // Fetch latest albums/singles
                const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${artist_id}/albums?include_groups=album,single&limit=4`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (albumsResponse.ok) {
                    const albumsData = await albumsResponse.json();
                    releases = albumsData.items.map(item => ({
                        title: item.name,
                        url: item.external_urls.spotify,
                        image: item.images[0]?.url,
                        release_date: item.release_date,
                        type: item.album_type
                    }));
                }
            }
        }

        // 3. Return Combined Data
        return {
            statusCode: 200,
            body: JSON.stringify({
                listeners: parseInt(listeners) || 0,
                followers: parseInt(followers) || 0,
                releases: releases
            })
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
}