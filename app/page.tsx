import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Pricing from '@/components/Pricing';
import FAQ from '@/components/FAQ';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="hero pt-[104px] pb-[100px] relative overflow-hidden" id="start">
          <div className="wrap hero-inner relative">
            <div className="hero-copy text-center relative z-2">
              <div className="eyebrow flex items-center gap-[10px] text-[11px] uppercase tracking-[2.2px] font-extrabold text-[#7a8479]">
                 <span className="w-[7px] h-[7px] bg-[#99c282] rounded-full shadow-[0_0_0_4px_#b9d8a541]"></span> THE NEW WAY TO GO MOBILE
              </div>
              <h1 className="font-sans font-bold text-[clamp(55px,6.15vw,92px)] leading-[1.09] mt-[29px] mb-[25px]">Your website.<br/><span>Now an Android app.</span></h1>
              <p className="text-[17px] leading-[1.82] text-[#626e71] max-w-[560px] mx-auto mb-[35px]">Everything you've built for the web, now in an app with your name on it. No coding. No accounts. No subscriptions.</p>
              <form className="url-form max-w-[620px] mx-auto" action="/create" method="get">
                <div className="flex items-center bg-white border border-[#d8ddd7] p-[7px_7px_7px_21px] rounded-[14px] shadow-[0_10px_45px_#2b332013,0_2px_5px_#26302106]">
                  <input name="url" type="text" placeholder="https://yourwebsite.com" required className="border-0 bg-transparent outline-none w-full h-[46px] text-[15px] px-[13px] text-[#202629]" />
                  <button type="submit" className="bg-[#1b2024] text-white rounded-[9px] px-[22px] h-[51px] font-bold text-[13px] flex items-center gap-[22px]">Preview my app ↗</button>
                </div>
              </form>
            </div>
          </div>
        </section>
        {/* Other sections would follow here */}
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
