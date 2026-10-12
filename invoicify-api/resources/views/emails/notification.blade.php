<!doctype html>
<html>
<body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#0b0e14;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
    <div style="background:#0b0e14;color:#ffffff;padding:18px 24px;">
      <strong style="font-size:16px;">Love Realty</strong>
      <span style="color:#9ca3af;font-size:12px;"> &middot; Client Billing</span>
    </div>
    <div style="padding:24px;font-size:14px;line-height:1.6;">
      {!! nl2br(e($body)) !!}
      @if (! empty($actionUrl))
        <p style="margin:24px 0 0;">
          <a href="{{ $actionUrl }}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px;">{{ $actionLabel ?: 'Open Invoicify' }}</a>
        </p>
        <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">Or copy this link into your browser: {{ $actionUrl }}</p>
      @endif
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
      Sent automatically by Invoicify on behalf of Love Realty, Tagum City.
      Invoicify does not accept online payments. Please do not reply to this email.
    </div>
  </div>
</body>
</html>
