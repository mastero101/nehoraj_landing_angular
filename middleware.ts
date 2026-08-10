export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const postId = url.searchParams.get('post') || url.searchParams.get('id');
  const userAgent = request.headers.get('user-agent') || '';

  const isSocialCrawler = /LinkedInBot|facebookexternalhit|Twitterbot|WhatsApp|Slackbot|TelegramBot|Discordbot|SkypeUriPreview|Googlebot|bingbot/i.test(userAgent);

  if (isSocialCrawler && postId) {
    const ogUrl = new URL('/api/og-preview', request.url);
    ogUrl.searchParams.set('post', postId);
    
    return fetch(ogUrl.toString(), {
      headers: {
        'user-agent': userAgent,
        'accept': request.headers.get('accept') || '*/*'
      }
    });
  }
}

export const config = {
  matcher: ['/', '/index.html'],
};
