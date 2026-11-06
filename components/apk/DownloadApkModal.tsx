'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  Smartphone,
  CheckCircle,
  QrCode,
  HardDriveDownload,
  Copy,
  Check,
  Wifi,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface DownloadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadApkModal: React.FC<DownloadApkModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [serverIp, setServerIp] = useState<string>('10.245.154.194');
  const [port, setPort] = useState<string>('3001');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const currentPort = window.location.port || '3001';
      setPort(currentPort);

      // If user is accessing via an IP, use that; otherwise default to Wi-Fi IP
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        setServerIp(hostname);
      } else {
        setServerIp('10.245.154.194');
      }
    }
  }, []);

  if (!isOpen) return null;

  const phoneDownloadUrl = `http://${serverIp}:${port}/Sushi-Hotel-POS.apk`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(phoneDownloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Robust direct APK download via Fetch + Blob
  const handleDownloadApk = async () => {
    setIsDownloading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/Sushi-Hotel-POS.apk', {
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'Sushi-Hotel-POS.apk';
      link.setAttribute('type', 'application/vnd.android.package-archive');
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 200);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.warn('Blob download error, falling back to direct navigation:', err);
      // Fallback: direct window navigation to the APK
      window.location.href = '/Sushi-Hotel-POS.apk';
    } finally {
      setIsDownloading(false);
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    phoneDownloadUrl
  )}&color=0f172a&bgcolor=ffffff&qzone=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Smartphone size={20} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Download Android APK
              </h2>
              <p className="text-[11px] text-slate-400">Sushi Hotel POS Mobile & Tablet App</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-center text-xs text-slate-300 max-h-[85vh] overflow-y-auto">
          {/* APK Badge Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-900 border border-slate-800 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1.5 shadow-lg">
              <Smartphone size={28} />
            </div>
            <h3 className="font-bold text-base text-white">Sushi Hotel POS APK</h3>
            <p className="text-[11px] font-mono text-emerald-400 font-semibold mt-0.5">
              com.sushihotel.pos • v1.2.0 (Signed Release)
            </p>
            <span className="mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
              Compatible with Android 8.0 to Android 15
            </span>
          </div>

          {/* Direct Download Button (Primary) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleDownloadApk}
              disabled={isDownloading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-slate-950" />
                  <span>Downloading APK File...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle size={18} className="text-slate-950" />
                  <span>APK Downloaded Successfully!</span>
                </>
              ) : (
                <>
                  <HardDriveDownload size={18} />
                  <span>Download APK Now (Direct)</span>
                </>
              )}
            </button>

            {/* Direct fallback link */}
            <div className="text-[11px] text-slate-400">
              Direct file link:{' '}
              <a
                href="/Sushi-Hotel-POS.apk"
                download="Sushi-Hotel-POS.apk"
                className="text-emerald-400 hover:underline font-mono"
              >
                Sushi-Hotel-POS.apk (12.5 KB)
              </a>
            </div>
          </div>

          {/* QR Code Section for Mobile Scanning */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Wifi size={14} className="text-emerald-400" />
              <span>Install Directly onto Mobile Phone</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl shadow-lg border-2 border-emerald-400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="Scan to Download APK"
                className="w-36 h-36 object-contain"
              />
            </div>

            <div className="text-[11px] text-slate-300 font-medium">
              Scan with phone camera while connected to same Wi-Fi
            </div>

            {/* Configurable Server IP / Port */}
            <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-left space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold text-slate-300">Local Wi-Fi Server URL:</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={11} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> Copy Link
                    </>
                  )}
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={serverIp}
                  onChange={(e) => setServerIp(e.target.value)}
                  placeholder="e.g. 10.245.154.194"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                  title="Your computer's local Wi-Fi IP address"
                />
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="3001"
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none text-center"
                  title="Server Port"
                />
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate">
                Target: {phoneDownloadUrl}
              </div>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="text-left p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] text-slate-400">
            <span className="font-bold text-white block mb-1">Android Installation Steps:</span>
            <p>1. Tap the green <strong>Download APK Now</strong> button or scan the QR code.</p>
            <p>2. Open your phone downloads and tap <strong>Sushi-Hotel-POS.apk</strong>.</p>
            <p>3. Tap <strong>Install</strong> (Allow from this source if prompted by Android).</p>
            <p>4. Launch the app & connect seamlessly to the POS system.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
