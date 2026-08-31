export function bodyFrom(document: string): string {
  const body = document.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!body) throw new Error('The source document is missing its body content.');
  return body;
}

export function StaticDocument({ document }: { document: string }) {
  return (
    <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: bodyFrom(document) }} />
  );
}
