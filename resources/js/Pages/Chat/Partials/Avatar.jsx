export default function Avatar({ src, alt, className = "" }) {
  function cn(...a) {
    return a.filter(Boolean).join(" ");
  }

  // Ukuran bawaan hanya dipakai bila pemanggil tidak menentukan sendiri.
  // Menumpuk "h-11 w-11" dengan "h-9 w-9" tidak bisa diandalkan: keduanya
  // punya kekhususan CSS yang sama, jadi yang menang ditentukan urutan di
  // stylesheet hasil build - bukan urutan atribut class.
  const hasSize = /(^|\s)(h-|w-|size-)/.test(className);

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "rounded-full object-cover bg-neutral-200",
        hasSize ? "" : "h-11 w-11",
        className
      )}
    />
  );
}
