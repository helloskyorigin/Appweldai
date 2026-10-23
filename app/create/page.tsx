'use client';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function CreateApp() {
  const [url, setUrl] = useState('');
  const [appName, setAppName] = useState('');
  const [color, setColor] = useState('#d8e6b5');

  return (
    <>
      <Header />
      <main className="min-h-[70vh] py-[85px] px-12 mx-auto max-w-[1240px]">
        <span className="text-[10px] uppercase tracking-[2.2px] font-extrabold text-[#7a8479]">YOUR APP STARTS HERE</span>
        <h1 className="font-sans font-bold text-[clamp(44px,6vw,72px)] leading-[1.12] mt-[12px] mb-[19px]">Bring your website<br/>to Android.</h1>
        <div className="grid grid-cols-2 gap-[70px] items-start">
          <div className="bg-white p-[36px] border border-[#e2e6e1] rounded-[20px]">
             <label className="block text-[12px] font-extrabold mb-[9px]">WEBSITE URL</label>
             <input value={url} onChange={(e) => setUrl(e.target.value)} className="p-[15px_16px] border border-[#d5dcd4] rounded-[9px] w-full mb-[20px]" placeholder="https://yourwebsite.com" />
             <label className="block text-[12px] font-extrabold mb-[9px]">APP NAME</label>
             <input value={appName} onChange={(e) => setAppName(e.target.value)} className="p-[15px_16px] border border-[#d5dcd4] rounded-[9px] w-full mb-[20px]" placeholder="My App" />
             <label className="block text-[12px] font-extrabold mb-[9px]">APP SPLASH COLOR</label>
             <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-[52px] cursor-pointer p-[6px] border border-[#d5dcd4] rounded-[9px] w-full mb-[20px]" />
          </div>
          <aside className="bg-[#eaf0e7] rounded-[16px] p-[32px]">
            <div className="bg-[#e2e8dd] rounded-[15px] p-[35px] text-center mt-[25px]">
               <div style={{backgroundColor: color}} className="grid place-items-center w-[93px] h-[93px] rounded-[22px] mx-auto text-[38px] font-extrabold text-[#202a1f] shadow-[0_12px_25px_#24311b22]">
                 {(appName || 'A')[0].toUpperCase()}
               </div>
               <h2 className="mt-[25px] mb-[5px] text-[21px] font-bold">{appName || 'My App'}</h2>
               <p className="text-[12px]">{url ? new URL(url.startsWith('http') ? url : `https://${url}`).hostname : 'yourwebsite.com'}</p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
