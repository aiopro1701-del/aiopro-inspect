/* ────────────────────────────────────────────────────────────
   Every native call goes through here.

   Each function tries the Capacitor plugin first and falls back
   to a browser equivalent, so `npm run dev` works on the laptop
   and the same code runs on the phone.
   ──────────────────────────────────────────────────────────── */

const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

/* ── Camera ─────────────────────────────────────────────── */

const MAX_EDGE = 1400;   // long edge in px — keeps a full job under control
const QUALITY = 0.72;

function downscale(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', QUALITY));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function takePhoto() {
  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const shot = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      correctOrientation: true,
      saveToGallery: false,
    });
    return downscale(shot.dataUrl);
  }
  // Browser: open a file picker that prefers the rear camera on a phone
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return reject(new Error('cancelled'));
      const r = new FileReader();
      r.onload = () => downscale(r.result).then(resolve);
      r.onerror = () => reject(new Error('read failed'));
      r.readAsDataURL(file);
    };
    input.click();
  });
}

export async function pickImage() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return reject(new Error('cancelled'));
      const r = new FileReader();
      r.onload = () => downscale(r.result).then(resolve);
      r.onerror = () => reject(new Error('read failed'));
      r.readAsDataURL(file);
    };
    input.click();
  });
}

/* ── Saving and sharing the finished report ─────────────── */

export async function savePdf(filename, blob) {
  if (isNative()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    try {
      await Share.share({ title: filename, url: written.uri, dialogTitle: 'Send report' });
    } catch (e) {
      /* user dismissed the share sheet — the file is still saved */
    }
    return written.uri;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return filename;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export { isNative };
