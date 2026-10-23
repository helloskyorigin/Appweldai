export default function Pricing() {
  return (
    <section className="bg-[#f2f5f0] py-[150px]" id="pricing">
      <div className="wrap pricing-layout grid grid-cols-2 gap-[120px] items-center px-12 mx-auto max-w-[1240px] w-full">
        <div className="pricing-intro">
          <span className="text-[10px] text-[#79877b]">06 / REFRESHINGLY SIMPLE</span>
          <h2 className="font-sans font-bold text-[clamp(45px,5vw,72px)] leading-[1.12] my-[25px]">A great app.<br/><span className="text-[#a4aca6]">One simple price.</span></h2>
          <p className="text-[16px] leading-[1.9] text-[#738078] max-w-[480px]">No plans to compare, accounts to maintain, or ongoing Appweld subscriptions.</p>
        </div>
        <div className="price-detail bg-white rounded-[22px] border border-[#e4e8e2] p-[35px_43px] shadow-[0_14px_50px_#1f32100a]">
          <div className="flex justify-between items-center text-[10px] font-extrabold tracking-[1.5px] text-[#59645b]">
            <span>APPWELD FOR ANDROID</span>
            <span className="rounded-[20px] bg-[#e7f3df] p-[9px_12px] text-[9px] tracking-[0.7px] text-[#557247]">LAUNCH OFFER</span>
          </div>
          <div className="flex items-end gap-[20px] my-[38px]">
            <strong className="font-sans text-[90px] tracking-[-7px] leading-[0.95]">$9</strong>
            <span className="text-[14px] leading-[1.6] text-[#7d8780] pb-[7px]">one-time<br/>per Android app</span>
          </div>
        </div>
      </div>
    </section>
  );
}
