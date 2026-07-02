import { useState, useEffect, ImgHTMLAttributes } from "react";

interface FadeImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export function FadeImg({ src, style, onLoad, onError, ...props }: FadeImgProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
  }, [src]);

  return (
    <img
      src={src}
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.25s ease", ...style }}
      onLoad={(e) => { setVisible(true); onLoad?.(e); }}
      onError={(e) => { onError?.(e); }}
      {...props}
    />
  );
}
