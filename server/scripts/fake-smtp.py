#!/usr/bin/env python3
"""Fake SMTP server for testing - captures emails in memory and serves via HTTP API."""
import asyncio, json, os, sys
from email import message_from_bytes

captured = []

class SMTPHandler:
    async def handle_DATA(self, server, session, envelope):
        msg = message_from_bytes(envelope.content)
        captured.append({
            'mail_from': envelope.mail_from,
            'rcpt_tos': envelope.rcpt_tos,
            'subject': str(msg['subject'] or ''),
            'to': str(msg['to'] or ''),
            'body': msg.get_payload(decode=True).decode('utf-8', errors='replace') if msg.is_multipart() else str(msg.get_payload()),
        })
        return '250 OK'

async def run_smtp(host='0.0.0.0', port=1025):
    from aiosmtpd.controller import Controller
    class CustomController(Controller):
        def factory(self):
            return SMTPHandler()
    ctrl = CustomController(hostname=host, port=port)
    ctrl.start()
    print(f'[SMTP] Fake server on {host}:{port}', flush=True)
    return ctrl

async def run_api(host='0.0.0.0', port=8025):
    from aiohttp import web
    async def list_mails(req):
        return web.json_response(captured)
    async def clear_mails(req):
        captured.clear()
        return web.json_response({'ok': True})
    app = web.Application()
    app.router.add_get('/api/v2/messages', list_mails)
    app.router.add_delete('/api/v2/messages', clear_mails)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()
    print(f'[SMTP] API on {host}:{port}', flush=True)
    return runner

async def main():
    smtp_ctrl = await run_smtp()
    api_runner = await run_api()
    print('[SMTP] Ready', flush=True)
    # keep running
    await asyncio.Event().wait()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('[SMTP] Stopped')
