import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#fafbf8] pt-[75px]">
      <div className="flex justify-between gap-[90px] pb-[90px] px-12 mx-auto max-w-[1240px] w-full">
        <div className="flex flex-col gap-5">
          <Link href="/" className="inline-flex items-center gap-3">
             <span className="font-sans text-2xl font-extrabold tracking-[-1.6px]">appweld<span className="text-[#9dbf8d]">.</span></span>
          </Link>
          <p className="text-[13px] leading-[1.9] text-[#8a948c]">From the web to something<br/>you can install.</p>
        </div>
        <div className="grid grid-cols-3 gap-[54px]">
          <div className="flex flex-col gap-[17px]">
            <h3 className="text-[10px] uppercase tracking-[1.5px]">Product</h3>
            <Link href="#experience" className="text-[12px] text-[#7d8980] hover:text-[#19221a]">Experience</Link>
            <Link href="#customize" className="text-[12px] text-[#7d8980] hover:text-[#19221a]">Customization</Link>
            <Link href="#how-it-works" className="text-[12px] text-[#7d8980] hover:text-[#19221a]">How it works</Link>
            <Link href="#pricing" className="text-[12px] text-[#7d8980] hover:text-[#19221a]">Pricing</Link>
            <Link href="#faq" className="text-[12px] text-[#7d8980] hover:text-[#19221a]">FAQ</Link>
          </div>
          <div className="flex flex-col gap-[17px]">
            <h3 className="text-[10px] uppercase tracking-[1.5px]">Resources</h3>
            <Link href="/legal/guide" className="text-[12px] text-[#7d8980] hover:text-[#19221a]">Publishing guide</Link>
            <Link href="/legal/contact" className="text-[12px] text-[#7d8980] hover:text-[#19221a]">Contact</Link>
            <Link href="/legal/acceptable-use" className="text-[12px] text-[#7d8980] hover:text-[#19221a]">Acceptable use</Link>
          </div>
          <div className="flex flex-col gap-[17px]">
            <h3 className="text-[10px] uppercase tracking-[1.5px]">Legal</h3>
            <Link href="/legal/privacy" className="text-[12px] text-[#7d8980] hover:text-[#19221a]">Privacy policy</Link>
            <Link href="/legal/terms" className="text-[12px] text-[#7d8980] hover:text-[#19221a]">Terms of service</Link>
            <Link href="/legal/refunds" className="text-[12px] text-[#7d8980] hover:text-[#19221a]">Refunds & delivery</Link>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center px-12 py-[25px] border-t border-[#e0e6de] text-[#8a958b] text-[11px] mx-auto max-w-[1240px] w-full">
        <span>© {new Date().getFullYear()} Appweld</span>
        <span>Crafted for the things you build.</span>
      </div>
    </footer>
  );
}
