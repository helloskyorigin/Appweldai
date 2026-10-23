'use client';
import { useState } from 'react';

export default function FAQ() {
  const faqs = [
    { q: "Can any website become an Android app?", a: "Appweld is intended for responsive HTTPS websites you own or have permission to convert. Some sites need changes before they work reliably inside an Android WebView, particularly sites with certain sign-in, payment or device-access flows." },
    { q: "Can I publish the app on Google Play?", a: "We plan to supply an Android App Bundle (AAB) suitable for submission, but Google Play applies its own quality, functionality and policy reviews. Delivery of an AAB never guarantees acceptance, and you'll need your own eligible Play Console account." },
    { q: "Will changing my website update the app?", a: "In a WebView-based app, content loaded from your live website generally reflects your website updates. Native configuration changes such as the app icon or package identity require a rebuild." },
    { q: "Are there accounts or monthly fees?", a: "No Appweld signup or ongoing subscription is planned. You pay once for each generated app. Your own website hosting and any separate app-store costs remain your responsibility." },
    { q: "What if my app isn't compatible?", a: "We aim to surface common compatibility problems before checkout. Some integrations require testing on a real device, so no automated check can guarantee every feature. Our final checkout will explain build-failure handling and support terms before taking payment." },
    { q: "How long are my files available?", a: "Completed build artifacts are intended to be stored only temporarily, with a secure download window announced before checkout. Download and safely back up your APK, AAB and signing files as soon as they're ready." },
  ];

  return (
    <section className="bg-white py-[150px]" id="faq">
      <div className="wrap faq-layout grid grid-cols-[0.8fr,1.2fr] gap-[110px] px-12 mx-auto max-w-[1240px] w-full">
        <div className="faq-intro">
          <span className="text-[10px] text-[#79877b] uppercase tracking-[1.6px]">QUESTIONS, ANSWERED</span>
          <h2 className="font-sans font-bold text-[clamp(45px,5vw,72px)] leading-[1.12] my-[25px]">The details<br/><span className="text-[#a4aca6]">matter.</span></h2>
        </div>
        <div className="faq-list border-t border-[#e4e8e3]">
          {faqs.map((faq, i) => (
            <details key={i} className="border-b border-[#e4e8e3]">
              <summary className="list-none flex justify-between items-center py-[26px] font-bold text-[14px] cursor-pointer">
                {faq.q} <span className="text-[23px] text-[#8b958d]">+</span>
              </summary>
              <p className="pb-[25px] text-[13px] leading-[1.95] text-[#738078]">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
