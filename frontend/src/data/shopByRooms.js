export const roomImages = {
  lobby: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWyenOu5xz_RLC8KS1nKppSGodO6bMQup7Kwf_L8fAu_HZJrzZgFrli6D-PGmlSveU-nc2GTD2OkWbbzC7Ua3t0WFaMoeKBlXPLjXQcnrZxMbmz_lr2VEZzOpnLHwvzIin5QBRVx6rsEzcueho2VOoQ9ym32grbiLNDlOq_6vsvRWzP_3OJa5s1eoWFKh73MlWEN-Vx3YPYNY2COqbv99nKo7j79bFjORlTr2FJnaK3iNw1AoaRhi9gzJAdIaRr7eLqrVyhU3O6g',
  living: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6IB_eyOLGHgVmP_-NCSCfwoKsvJdNZITEH9_4MhnRg0_bVmaHUrCX6b-35tFdnP2uaNFvfDWDsh4t_RdTLxutkY_Xww7CgTx_LKzBRYbnSVfcToNtAJ9Og26-cG1zNiuh1cf47bY_wPUDvNWL4HQqsy0fKq8lHcXf55Xpk9Uk4TgTaNjKTw2p8J7-ORv8DAG5CR-c9IA5mS6a19z-sliMqnuIp1YxhrqwkB5cPMn-i-I0COJakbGJeWdzQ4H18MacYU-Sptj9Cg',
  dining: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBH02Dl9QQALlsNhnpX-_9u8HgUHSNqr1DH6NFTR5P_MD6GjNuULPtrV8X0QAsnL5skLb-LDeHnUzqTkN7juKudjfA0SKgiJcbsv1cLSGHCj5xykuvO8QQ24wHufdeN6JPqlTtAyo25iu_Wadz0FZTbG0spB2M5dDDRjSF5ZyGYdbNvoi3YJRkJuokQcghqYYpxfEfF14Gm_GehHZDWtPNJzx7HXynSl9d89u5_IzgYUSPhZ1xtXunoPE1uEXTSTEntxoF5kHAGKg',
  bedroom: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5ifo7yywzMkm4NQrPbj03O6RkzB0SKfwdJ5Clr07FQ_OT93TvV6QdpYh6f_OwZ-dGr5m6_piisPDeqF69xbthTd3G8vF34M4ebWbChI1NerlPY-w0ImlHPLtN3gkyL7ZeWq848basKscaqEHYI_z_fAGrP1aFG7XTgHDkkhzJqoSE345qVnRxaKUoyI9GNmsenauPrrdQDvrklsTvuHnAV_9jcWujgFrcIvfQa1GF3SPuE53KlZtZ-kL5s0ePwhh-B0utBueB1g',
};

export const rooms = [
  {
    slug: 'lobby',
    roomName: 'Մուտք',
    title: 'Մուտքի տարածք',
    description: 'Մուտքի արվեստը. քանդակային ձեւեր, որոնք ընդունում են հյուրին եւ սահմանում տան առաջին տպավորությունը։',
    image: roomImages.lobby,
    align: 'right',
    tone: 'light',
    imageClass: 'is-muted',
  },
  {
    slug: 'living-room',
    roomName: 'Հյուրասենյակ',
    title: 'Հյուրասենյակ',
    description: 'Հանգստի եւ շփման տարածք՝ կառուցված հավասարակշռության, հյուսվածքի եւ լույսի շուրջ։',
    image: roomImages.living,
    align: 'left',
    tone: 'light',
    italicDescription: true,
  },
  {
    slug: 'kitchen',
    roomName: 'Խոհանոց',
    title: 'Խոհանոց',
    description: 'Ֆունկցիոնալ քանդակ տան խոհարարական սրտի համար։',
    image: roomImages.dining,
    align: 'right',
    tone: 'primary',
    imageClass: 'is-grayscale',
  },
  {
    slug: 'bedroom',
    roomName: 'Ննջասենյակ',
    title: 'Ննջասենյակ',
    description: 'Լուռ շքեղություն՝ ստեղծված անձնական պահերի եւ հանգիստ միջավայրի համար։',
    image: roomImages.bedroom,
    align: 'left',
    tone: 'walnut',
    tall: true,
  },
];
