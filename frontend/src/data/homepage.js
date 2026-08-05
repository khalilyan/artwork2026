import logo from '../assets/images/logo.png';

export const images = {
  logo,
  hero: 'https://lh3.googleusercontent.com/aida/AP1WRLtU-ZE-ZxwoMg5sV0f8FRSaZ2KnHYwvfNnwABSY43wdy2s26i7JV2Csm1-OC4rwFoyYRHd0OYFNKs4cpUbCzngnsItDHEYiAR_GOueWHHxwyTRel18wUHYP0U4Kh7O3-_Lt4nkOSefgkgtvHv7ITOmZvcNh6CjONrOQ_3rsc606xdUwQdVqjhsbBZzcJprUSHdrc36Qz-cUO0dinKAtm426n-kTuJ4BnNnjo3u5dFluE7VFGfTf9sYHyw',
  living: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDde5DxRcfKhPmfRd713rQ9Ju9zoxMCiwafMQrh0gTZck2ovnnjgkrLfGxAjuOh5ddARMoNBKh2l60BskAHMs5iPPk-kHjRQFBpSOwMnKzmUI39X0Zom6tg3Y-FOzISnf2bzzGEFtpByHo-BCHGtZcodDZ5pK0i3AwSuHBBj87MB-5WMbzd6uynDsSxeZ9r1QKP2TmVvIxA42R6t_HbmRy4lVV1q-LrqlVD8gEQx8J78G9YJEdtwUUWCupTFlzubUUMvlzYjR8MCA',
  studioArtifacts: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBoNK7xVyHZjTSzAwPysLIMt_fbPIxLpb_FZ8zOwFXvsd3lcx-CaO37nSeid7WNN9jT37HO3gmckYNwEBFWug524yWvwwjC3fIfuK8EdRxOk2uWkWXgsiEd3cAbsRN8pfYvXvieX3uJ11HZh_Nel7s-SzoFYAocmyH9kjXoSLWbemp06aGfEDM-SwF8gssgAsQBNGNTaReejMt6C59bFFiDpYEFz5X1YqnbIch7uPh36bWvTlb1C3Jcge1ngeT7S0RkaAbUEhduw',
  archive: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQvPa4-s_1zVoBCQhXdX13CoOuP0oJg0tD8u-ogVGPM2l36814pyp255QAraFx2egLOpCwqHp_Vcy6KSFrNhjaaoqhU2riDbVGdhBMm0NwqKyUZ7IGmEf0j74nlZRwtlEeRcUeTQXiwK_zwJeLPjEQeK7IIqZX4I5QZgPJW9r5ZXxOHDYm15AlGnBg0GJwaEVh9MgoKqTe6vVJFEkHl5xLe5NnqZLaUFEU-gSMDuGvWsAmMFzGkKUercGj0RhuWfrGYK-CyXf9Ow',
  studio: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvbiD4d5_IdGMZB_hR8GjAhQ5-qcl_LF1FEgeHzMrrbNb1tygwkMgmGbFz0RuuiRm3Nil1m6YdOdlP3hQuv8piIj9Fa8SaYNMUI8Bce0HDeElZG3cafKzRLc4BYlFRYyR6-XBok1CWZJDWEEMIHo-VhHVOSV_1KpkcOkLUt_i5-UtqSZ5z-DxDw6WaRlVKZjRQyk8K_xL7rd3pm69TziiJ8L-mr7p9y0B0rQlvdGJ-Nc4NvUXMDMt_Vg8uBimFRPe7pBq43lKezg',
};

export const heroSlides = [
  {
    title: 'ԱՐԹՎՈՐՔ ԿԱՀՈՒՅՔ',
    subtitle: 'ԸՆԿՈՒԶԵՆՈՒ ԵՎ ՈՍԿՈՒ ՀԱՎԱՔԱԾՈՒ',
    image: images.living,
  },
  {
    title: 'ԲՆԱԿԵԼԻ ՏԱՐԱԾՔՆԵՐ',
    subtitle: 'ՃԱՐՏԱՐԱՊԵՏԱԿԱՆ ՆՍՏԱՏԵՂԻՆԵՐ ԵՎ ՀԱՐՄԱՐԱՎԵՏՈՒԹՅՈՒՆ',
    image: images.archive,
  },
  {
    title: 'ՍՏՈՒԴԻԱՅԻ ԱՌԱՐԿԱՆԵՐ',
    subtitle: 'ԱՇԽԱՏԱՆՔԱՅԻՆ ՏԱՐԱԾՔԻ ՆՈՐ ՄԱԿԱՐԴԱԿ',
    image: images.studio,
  },
];

export const collections = [
  {
    title: 'ԲՆԱԿԵԼԻ ՏԱՐԱԾՔՆԵՐ',
    subtitle: 'Ճարտարապետական նստատեղեր եւ հարմարավետություն',
    image: images.living,
    href: '/the-sculptural-series',
  },
  {
    title: 'ՍՏՈՒԴԻԱՅԻ ԱՌԱՐԿԱՆԵՐ',
    subtitle: 'Աշխատանքային տարածքի նոր մակարդակ',
    image: images.studioArtifacts,
    href: '/architectural-monoliths',
    raised: true,
  },
  {
    title: 'ԱՐԽԻՎ',
    subtitle: 'Սահմանափակ համարակալված թողարկումներ',
    image: images.archive,
    href: '/modern-heritage',
  },
];

export const footerGroups = [
  {
    title: 'ՆԱՎԻԳԱՑԻԱ',
    links: ['Հավաքածուներ', 'Արխիվ', 'Պատվերով', 'Ամսագիր'],
  },
  {
    title: 'ՀԱՃԱԽՈՐԴՆԵՐ',
    links: ['Ցուցասրահներ', 'Փոխանակում', 'Առաքում', 'Հարցեր'],
  },
];
