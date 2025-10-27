from frappe.email.receive import EmailAccount
import frappe

def custom_populate_inbox(self):
    """Custom IMAP fetch that does NOT mark emails as read."""
    if not self.use_imap:
        return

    try:
        from imapclient import IMAPClient

        mail = IMAPClient(self.incoming_server, ssl=self.use_ssl)
        mail.login(self.username, self.get_password())
        mail.select_folder(self.folder, readonly=True)  # <-- key change (readonly=True)

        # Only fetch unseen
        messages = mail.search(['UNSEEN'])
        for uid, message_data in mail.fetch(messages, ['RFC822']).items():
            self.insert_communication(message_data[b'RFC822'], uid)
            # Notice: no mail.add_flags(uid, ['\\Seen'])  — keeps unread
        mail.logout()

    except Exception as e:
        frappe.log_error(f"Custom IMAP fetch error: {str(e)}", "Email Fetcher")

# Patch it in
EmailAccount.populate_inbox = custom_populate_inbox
