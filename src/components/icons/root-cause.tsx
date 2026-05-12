import Image from "next/image";
import logo from "@/app/logo.png";

export function RootCauseLogo({
  className,
  width,
  height,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <Image
      src={logo}
      alt="Root Cause"
      width={width ?? 32}
      height={height ?? 32}
      className={className}
    />
  );
}
