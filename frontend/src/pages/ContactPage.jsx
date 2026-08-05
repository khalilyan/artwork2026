import { useState } from 'react';
import SeoMeta from '../components/ui/SeoMeta.jsx';
import { showArtworkNotification } from '../components/ui/ToastNotifications.jsx';
import { api } from '../services/api.js';
import { compressImageFiles } from '../utils/imageUpload.js';

const contactLinks = {
  email: 'artworkarmenia@gmail.com',
  instagram: 'https://www.instagram.com/artwork_furniture_official?igsh=Z2FiMjlrZnQ4bjRp',
  facebook: 'https://www.facebook.com/share/1EexLxBJow/',
};

export default function ContactPage() {
  const [buttonText, setButtonText] = useState('ՈՒՂԱՐԿԵԼ ՀԱՐՑՈՒՄԸ');

  const [images, setImages] = useState([]);
  const [imageStatus, setImageStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setButtonText('ՈՒՂԱՐԿՎՈՒՄ Է...');

    try {
      await api.submitContact({
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        images,
      });
      setButtonText('ՀԱՂՈՐԴԱԳՐՈՒԹՅՈՒՆԸ ՍՏԱՑՎԵՑ');
      showArtworkNotification('Հաղորդագրությունն ուղարկվեց արհեստանոց');
      setImages([]);
      setImageStatus('');
      form.reset();

      window.setTimeout(() => {
        setButtonText('ՈՒՂԱՐԿԵԼ ՀԱՐՑՈՒՄԸ');
      }, 2500);
    } catch (error) {
      setButtonText('ՈՒՂԱՐԿԵԼ ՀԱՐՑՈՒՄԸ');
      showArtworkNotification(error.message ?? 'Չհաջողվեց ուղարկել հաղորդագրությունը', 'error');
    }
  };

  const selectImages = async (event) => {
    const remainingSlots = Math.max(0, 4 - images.length);

    if (!remainingSlots) {
      event.target.value = '';
      return;
    }

    try {
      setImageStatus('Նկարները պատրաստվում են...');
      const nextImages = await compressImageFiles(event.target.files, remainingSlots);
      setImages((currentImages) => [...currentImages, ...nextImages].slice(0, 4));
      setImageStatus('');
    } catch (error) {
      setImageStatus(error.message);
      showArtworkNotification(error.message, 'error');
    } finally {
      event.target.value = '';
    }
  };

  const removeImage = (image) => {
    setImages((currentImages) => currentImages.filter((currentImage) => currentImage !== image));
  };

  return (
    <main className="contact-page" lang="hy">
      <SeoMeta
        title="Կապ ARTWORK-ի հետ | Անհատական կահույք"
        description="Կապ հաստատեք ARTWORK-ի հետ դիզայներական կահույքի, անհատական ինտերիերի, վերականգնման, trade-in և սրահի խորհրդատվության համար։"
        url="/contact"
        keywords="կապ ARTWORK-ի հետ, անհատական կահույք Հայաստան, կահույքի սրահ, ինտերիերի խորհրդատվություն Երևան"
      />
      <section className="contact-hero container">
        <div className="contact-hero-copy reveal-section is-active" data-reveal>
          <h1>Կապ հաստատեք<br /><em>արհեստանոցի հետ</em></h1>
          <div className="contact-line" />
        </div>
      </section>

      <section className="contact-layout container">
        <form className="contact-form reveal-section is-active" data-reveal onSubmit={handleSubmit}>
          <label>
            <span className="label-caps">ԱՆՈՒՆ ԱԶԳԱՆՈՒՆ</span>
            <input name="fullName" type="text" placeholder="Արամ Մանուկյան" required />
            <i />
          </label>
          <label>
            <span className="label-caps">ԷԼ. ՀԱՍՑԵ</span>
            <input name="email" type="email" placeholder="atelier@artwork.com" required />
            <i />
          </label>
          <label>
            <span className="label-caps">ՀԵՌԱԽՈՍ*</span>
            <input name="phone" type="tel" placeholder="+374 98 871555" required />
            <i />
          </label>
          <label>
            <span className="label-caps">ՀԱՐՑՄԱՆ ԹԵՄԱ</span>
            <select name="subject" defaultValue="Ընդհանուր հարցում">
              <option>Ընդհանուր հարցում</option>
              <option>Անհատական պատվեր</option>
              <option>Առցանց խորհրդատվություն</option>
              <option>Համագործակցուրյուն</option>
            </select>
            <i />
          </label>
          <label>
            <span className="label-caps">ՀԱՂՈՐԴԱԳՐՈՒԹՅՈՒՆ</span>
            <textarea name="message" rows="4" placeholder="Նկարագրեք ձեր ցանկությունը..." required />
            <i />
          </label>
          <div className="contact-image-upload">
            <span className="label-caps">Նկարներ</span>
            <div className="contact-image-actions">
              <label className="contact-image-button label-caps">
                Վերբեռնել սարքից
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={selectImages} />
              </label>
              <label className="contact-image-button label-caps">
                Բացել տեսախցիկը
                <input type="file" accept="image/*" capture="environment" onChange={selectImages} />
              </label>
            </div>
            {imageStatus ? <p>{imageStatus}</p> : null}
            {images.length ? (
              <div className="contact-image-thumbs">
                {images.map((image, index) => (
                  <span className="contact-image-thumb" key={`${image.slice(0, 32)}-${index}`}>
                    <img src={image} alt={`Կցված նկար ${index + 1}`} />
                    <button type="button" onClick={() => removeImage(image)} aria-label="Հեռացնել նկարը">x</button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <button className="contact-submit label-caps" type="submit">{buttonText}</button>
        </form>

        <aside className="contact-info reveal-section is-active" data-reveal>
          <section>
            <h2 className="label-caps">ԿԱՊ</h2>
            <a href={`mailto:${contactLinks.email}`}>{contactLinks.email}</a>
            <p>+37498871555</p>
          </section>
          <section>
            <h2 className="label-caps">ՀԵՏԵՎԵԼ</h2>
            <nav>
              <a href={contactLinks.instagram} target="_blank" rel="noreferrer">Instagram</a>
              <a href={contactLinks.facebook} target="_blank" rel="noreferrer">Facebook</a>
            </nav>
          </section>
        </aside>
      </section>
    </main>
  );
}
