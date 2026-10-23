import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-10 bg-[rgba(250,250,248,0.89)] border-b border-[rgba(225,229,223,0.85)] backdrop-blur-xl">
      <div className="flex h-[86px] items-center justify-between gap-8 px-12 mx-auto max-w-[1240px] w-full">
        <Link href="/" className="inline-flex items-center gap-3 whitespace-nowrap">
          <span className="grid w-9 h-9 place-items-center bg-[#1b2124] rounded-xl text-[#d6f1cc]">
             <LayoutGrid size={24} />
          </span>
          <span className="font-sans text-2xl font-extrabold tracking-[-1.6px]">appweld<span className="text-[#9dbf8d]">.</span></span>
        </Link>
        <nav className="flex gap-9 items-center ml-auto">
          <Link href="#experience" className="font-semibold text-[13px] text-[#626a69] hover:text-[#13191d]">Experience</Link>
          <Link href="#customize" className="font-semibold text-[13px] text-[#626a69] hover:text-[#13191d]">Customize</Link>
          <Link href="#how-it-works" className="font-semibold text-[13px] text-[#626a69] hover:text-[#13191d]">How it works</Link>
          <Link href="#pricing" className="font-semibold text-[13px] text-[#626a69] hover:text-[#13191d]">Pricing</Link>
        </nav>
        <Link href="/create" className="bg-[#181c20] text-white rounded-[10px] inline-flex items-center justify-between gap-6 px-[19px] py-[14px] text-[13px] font-bold hover:bg-[#30363a] transition-all">
          Create your app ↗
        </Link>
      </div>
    </header>
  );
}
