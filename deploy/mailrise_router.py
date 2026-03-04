"""Custom Mailrise router: maps email recipients to ntfy topics.

Any email sent to <topic>@<anything> is forwarded as a push notification
to ntfys://ntfy.teedge.local/<topic>.
"""

from mailrise.router import AppriseNotification, EmailMessage, Router
from apprise import NotifyFormat, NotifyType
from logging import Logger
from typing import Any, AsyncGenerator


class NtfyRouter(Router):
    async def email_to_apprise(
        self,
        logger: Logger,
        email: EmailMessage,
        auth_data: Any,
        **kwargs,
    ) -> AsyncGenerator[AppriseNotification, None]:
        for recipient in email.to:
            topic = recipient.split("@")[0]
            if not topic:
                logger.warning("Skipping recipient with empty topic: %s", recipient)
                continue
            url = f"ntfys://ntfy.teedge.local/{topic}/?verify=no"
            logger.info("Routing %s -> %s", recipient, url)
            yield AppriseNotification(
                config=url,
                title=email.subject,
                body=email.body,
                notify_type=NotifyType.INFO,
                body_format=email.body_format,
                attachments=email.attachments,
                config_format="text",
            )


router = NtfyRouter()
authenticator = None
