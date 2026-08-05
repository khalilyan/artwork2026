import { motion } from 'framer-motion';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { images } from '../data/homepage.js';
import aboutHeroImage from '../assets/images/Logo_Mockup_2.png';
import aboutMaterialImage from '../assets/images/material.jpg';
import aboutWorkingImage from '../assets/images/working.jpg';
import usePageAssets from '../hooks/usePageAssets.js';
import { fadeUp, staggerGroup, viewportReveal } from '../utils/motion.js';

const aboutImages = {
  hero: aboutHeroImage,
  heritage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkzhM0P4ZMkf2qRPPUFtRXIZv2eapPHg44v0s4Fu6oW0CmHGhf4zSxjThUd_Vk9y2xCPu9FjvRQHn5z6Q5_rIOwg3Y_xRKKXeKi36CNT1DZ57H_i7fdMZy-znwSRMf60_HnSEzXeG4RyvrHyoHKU2ITMAAmeW7_mX-iAlWEcgisbW3n9BJ_UntpFq1CuxNeQNxQk4Xerh5kjt_zLC4eVhLd1p2Lz9RmCtDv96oWIUme4JuHe682VIU0FM1ynCPJZkAp31I4QGOKg',
  craft: aboutMaterialImage,
  precision: aboutWorkingImage,
};

export default function AboutPage() {
  const pageImages = usePageAssets('about', aboutImages);

  return (
    <main className="about-page" lang="hy">
      <SeoMeta
        title="About ARTWORK Furniture | Craftsmanship and Design"
        description="Learn about ARTWORK Furniture, an Armenian furniture studio focused on designer pieces, careful craftsmanship, premium materials, and long-lasting interiors."
        image={pageImages.hero}
        url="/about"
        keywords="about ARTWORK Furniture, Armenian furniture studio, furniture craftsmanship, designer furniture Armenia, premium materials"
      />
      <motion.section
        className="about-hero"
        variants={staggerGroup}
        initial="hidden"
        animate="visible"
      >
        <div className="container about-editorial-grid">
          <motion.div className="about-hero-copy reveal-section is-active" data-reveal variants={staggerGroup}>
            <motion.h1 variants={fadeUp}>ԱՐՀԵՍՏԻՑ ԱՐՎԵՍՏ<br />ՎԱՐՊԵՏԻՑ ԱՐՎԵՍՏԱԳԵՏ</motion.h1>
            <motion.p variants={fadeUp}>ARTWORK-ը հիմնադրվել է 2014 թվականին՝ մեկ պարզ գաղափարով․ ստեղծել բարձրորակ, ժամանակակից և մատչելի կահույք, որը կծառայի երկար տարիներ։ Այսօր մենք շարունակում ենք այդ նույն սկզբունքներով՝ համադրելով ժամանակակից դիզայնը, վստահելի նյութերը և վարպետական աշխատանքը։ Տարիներ շարունակ ARTWORK-ը հավատարիմ է մնացել իր արժեքներին և հաճախորդների վստահությանը՝ առաջարկելով որակյալ, մատչելի և ժամանակակից կահույք, որը համադրում է դիզայնը, հարմարավետությունն ու երկարատև ամրությունը։</motion.p>
            <motion.a className="about-outline-button label-caps" href="/rooms" variants={fadeUp}>ԴԻՏԵԼ ԲՈԼՈՐ ԱՊՐԱՆՔՆԵՐԸ</motion.a>
          </motion.div>
          <motion.div className="about-hero-image reveal-section is-active" data-reveal data-cursor-target variants={fadeUp}>
            <img src={pageImages.hero} alt="Մինիմալիստական բազկաթոռ" />
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="about-creed"
        id="philosophy"
        variants={staggerGroup}
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        <motion.div className="container" variants={staggerGroup}>
          <motion.span className="label-caps" variants={fadeUp}>ՄԵՐ ԹԻՄԸ</motion.span>
          <motion.h2 variants={fadeUp}>&ldquo;Վարպետություն՝ յուրաքանչյուր մանրուքում&rdquo;</motion.h2>
          <motion.p variants={fadeUp}>
            ARTWORK-ը միավորում է մարդկանց, ովքեր սիրում են իրենց աշխատանքը և հավատում են որակի արժեքին։ Դիզայնից մինչև վերջնական մշակում՝ յուրաքանչյուր փուլ իրականացվում է նույն պատասխանատվությամբ, որպեսզի յուրաքանչյուր կահույք արդարացնի ձեր սպասելիքները և ծառայի երկար տարիներ։
          </motion.p>
        </motion.div>
      </motion.section>

      <motion.section
        className="about-heritage"
        variants={staggerGroup}
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        <div className="container about-editorial-grid">
          <motion.div className="about-image-stack reveal-section is-active" data-reveal variants={staggerGroup}>
            <motion.div variants={fadeUp}><img src={pageImages.heritage} alt="Ժառանգական նյութի դետալ" /></motion.div>
            <motion.div variants={fadeUp}><img src={pageImages.craft} alt="Վարպետության դետալ" /></motion.div>
          </motion.div>

          <motion.div className="about-heritage-copy reveal-section is-active" data-reveal variants={staggerGroup}>
            <motion.span className="label-caps" variants={fadeUp}>ԸՆՏՐՎԱԾ ՆՅՈՒԹԵՐ</motion.span>
            <motion.h2 variants={fadeUp}>Որակը սկսվում է ճիշտ ընտրությունից։</motion.h2>
            <motion.p variants={fadeUp}>Յուրաքանչյուր նյութ ընտրվում է ամրության, բնական տեսքի և երկարատև օգտագործման չափանիշներով։ Մենք համագործակցում ենք վստահելի մատակարարների հետ՝ ապահովելով կայուն որակ յուրաքանչյուր արտադրանքի համար։</motion.p>
            <motion.p variants={fadeUp}>Բնական փայտից և մետաղից մինչև բարձրորակ գործվածքներ ու երեսպատման նյութեր՝ յուրաքանչյուր բաղադրիչ ներդաշնակորեն համադրվում է՝ ստեղծելով կահույք, որը պահպանելու է իր տեսքն ու արժեքը տարիներ շարունակ։</motion.p>
            <motion.div className="about-established label-caps" variants={fadeUp}><span />ՀԻՄՆԱԴՐՎԵԼ Է 2014-ԻՆ</motion.div>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="about-precision"
        variants={staggerGroup}
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        <div className="container about-editorial-grid">
          <motion.div className="about-precision-image reveal-section is-active" data-reveal data-cursor-target variants={fadeUp}>
            <img src={pageImages.precision} alt="Ժամանակակից ճարտարագիտություն" />
          </motion.div>
          <motion.div className="about-precision-copy reveal-section is-active" data-reveal variants={staggerGroup}>
            <motion.h2 variants={fadeUp}>&ldquo;Վարպետություն, որը կատարելագործվում է ժամանակի հետ։&rdquo;</motion.h2>
            <motion.span className="label-caps" variants={fadeUp}>ԱՐՀԵՍՏԱՆՈՑԻ ՊԱՏՄՈՒԹՅՈՒՆԸ</motion.span>
            <motion.p variants={fadeUp}>Մեր արհեստանոցում յուրաքանչյուր նախագիծ սկսվում է գաղափարից և ավարտվում է բարձրակարգ կահույքով։ Փորձառու վարպետների աշխատանքը, ժամանակակից սարքավորումները և որակի նկատմամբ անզիջում մոտեցումը մեզ հնարավորություն են տալիս ստեղծել արտադրանք, որն առանձնանում է իր ամրությամբ, գեղագիտությամբ և մանրուքների նկատմամբ ուշադրությամբ</motion.p>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="about-inquiry"
        variants={staggerGroup}
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        <motion.div className="container reveal-section is-active" data-reveal variants={staggerGroup}>
          <motion.h2 variants={fadeUp}>Ձեր հաջորդ ինտերիերը սկսվում է այստեղ։</motion.h2>
          <motion.p variants={fadeUp}>Բացահայտեք մեր հավաքածուները կամ պատվիրեք անհատական կահույք՝ պատրաստված ձեր նախասիրություններին և տարածքին համապատասխան։</motion.p>
          <motion.div variants={fadeUp}>
            <a className="about-outline-button label-caps" href="/collections">ԴԻՏԵԼ ՀԱՎԱՔԱԾՈՒՆԵՐԸ</a>
            <a className="about-solid-button label-caps" href="/contact">ԿԱՊ ՀԱՍՏԱՏԵԼ</a>
          </motion.div>
        </motion.div>
      </motion.section>

      <img className="about-hidden-logo" src={images.logo} alt="" aria-hidden="true" />
    </main>
  );
}
