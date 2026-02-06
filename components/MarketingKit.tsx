
import React, { useState } from 'react';
import { Image as ImageIcon, FileText, Download, Sparkles, Copy, Check, Layout, Palette } from 'lucide-react';
import { generateMarketingImage, generateSEODescription } from '../services/geminiService';
import { Language } from '../types';
import { translations } from '../translations';
import { triggerHaptic } from '../utils';

interface Props {
  lang: Language;
  onClose: () => void;
}

const MarketingKit: React.FC<Props> = ({ lang, onClose }) => {
  const [iconImg, setIconImg] = useState<string | null>(null);
  const [bannerImg, setBannerImg] = useState<string | null>(null);
  const [seoData, setSeoData] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const t = translations[lang];

  const handleGenerateImg = async (type: 'icon' | 'banner') => {
    setLoading(type);
    triggerHaptic(50);
    try {
      const url = await generateMarketingImage(type);
      if (type === 'icon') setIconImg(url);
      else setBannerImg(url);
    } catch (err) {
      alert("Error generating image. Try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateText = async () => {
    setLoading('text');
    triggerHaptic(50);
    try {
      const data = await generateSEODescription(lang);
      setSeoData(data);
    } catch (err) {
      alert("Error generating text.");
    } finally {
      setLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    triggerHaptic(20);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[6000] bg-slate-900/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Sparkles className="text-blue-600" /> Marketing Kit AI
            </h2>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Genera activos para App Store & Play Store</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <Layout size={24} />
          </button>
        </div>

        <div className="p-8 space-y-12 overflow-y-auto no-scrollbar">
          {/* VISUAL ASSETS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest">
                <Palette size={16} /> Icono de App (512x512)
              </div>
              <div className="aspect-square bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group">
                {iconImg ? (
                  <>
                    <img src={iconImg} className="w-full h-full object-cover" alt="App Icon" />
                    <a href={iconImg} download="app_icon.png" className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download size={18} className="text-blue-600" />
                    </a>
                  </>
                ) : (
                  <button 
                    onClick={() => handleGenerateImg('icon')} 
                    disabled={!!loading}
                    className="flex flex-col items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {loading === 'icon' ? <Sparkles className="animate-spin" /> : <ImageIcon size={40} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{loading === 'icon' ? 'Generando...' : 'Generar Icono'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest">
                <ImageIcon size={16} /> Banner / Gráfico de Función
              </div>
              <div className="aspect-[16/9] bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group">
                {bannerImg ? (
                  <>
                    <img src={bannerImg} className="w-full h-full object-cover" alt="App Banner" />
                    <a href={bannerImg} download="app_banner.png" className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download size={18} className="text-blue-600" />
                    </a>
                  </>
                ) : (
                  <button 
                    onClick={() => handleGenerateImg('banner')} 
                    disabled={!!loading}
                    className="flex flex-col items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {loading === 'banner' ? <Sparkles className="animate-spin" /> : <ImageIcon size={40} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{loading === 'banner' ? 'Generando...' : 'Generar Banner'}</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* TEXT ASSETS */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest">
                <FileText size={16} /> Contenido SEO y Descripciones
              </div>
              <button 
                onClick={handleGenerateText} 
                disabled={!!loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 disabled:bg-slate-300 transition-all"
              >
                {loading === 'text' ? <Sparkles size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {seoData ? 'Regenerar Textos' : 'Generar Textos AI'}
              </button>
            </div>

            {seoData ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tagline / Eslogan</span>
                      <button onClick={() => copyToClipboard(seoData.tagline)} className="text-blue-500"><Copy size={14} /></button>
                    </div>
                    <p className="font-black text-lg text-slate-800">{seoData.tagline}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción Corta</span>
                      <button onClick={() => copyToClipboard(seoData.shortDescription)} className="text-blue-500"><Copy size={14} /></button>
                    </div>
                    <p className="text-sm font-bold text-slate-600">{seoData.shortDescription}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción Larga</span>
                      <button onClick={() => copyToClipboard(seoData.longDescription)} className="text-blue-500"><Copy size={14} /></button>
                    </div>
                    <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed h-48 overflow-y-auto no-scrollbar">{seoData.longDescription}</p>
                  </div>

                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Palabras Clave (SEO)</span>
                    <div className="flex flex-wrap gap-2">
                      {seoData.keywords.map((k: string) => (
                        <span key={k} className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">#{k.replace(/\s+/g, '')}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Pulsa el botón superior para redactar fichas SEO</p>
              </div>
            )}
          </section>
        </div>

        {copied && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <Check size={16} className="text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Copiado al portapapeles</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingKit;
