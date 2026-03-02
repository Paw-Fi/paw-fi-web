const fs = require('fs');
const file = 'src/routes/creator/tickets.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `function TicketAttachments({ attachments }: { attachments: SupportTicketAttachment[] }) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function loadUrls() {
      if (!attachments.length) return
      setIsLoading(true)
      const next: Record<string, string> = {}
      for (const attachment of attachments) {
        const { data, error } = await supabase.storage
          .from('support-attachments')
          .createSignedUrl(attachment.file_path, 60 * 60)
        if (!error && data?.signedUrl) {
          next[attachment.id] = data.signedUrl
        }
      }
      if (isMounted) {
        setSignedUrls(next)
        setIsLoading(false)
      }
    }
    loadUrls()
    return () => { isMounted = false }
  }, [attachments])

  if (isLoading) return <div className="text-sm text-white/50 animate-pulse">Loading attachments...</div>

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
      {attachments.map((attachment) => {
        const url = signedUrls[attachment.id]`;

const newCode = `function TicketAttachments({ attachments }: { attachments: SupportTicketAttachment[] }) {
  // Use the full public URL directly, falling back to constructing it if file_url is missing
  const getAttachmentUrl = (attachment: SupportTicketAttachment) => {
    if (attachment.file_url) return attachment.file_url;
    // Fallback for older attachments before the file_url migration
    const url = new URL(supabase.storageUrl || 'https://pbopcsmrcykdzbilpilf.supabase.co/storage/v1');
    return \`\${url.origin}/storage/v1/object/public/support-attachments/\${attachment.file_path}\`;
  };

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
      {attachments.map((attachment) => {
        const url = getAttachmentUrl(attachment);`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(file, content);
console.log('Patched successfully');
