// ===== CertificateModal =====
// Shows a certificate after completing all 11 days.

import { useRef, useState } from 'react';
import { useChallengeContext } from '../../context/ChallengeContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatDate } from '../../utils/dateHelpers';
import { toBlob } from 'html-to-image';
import { t } from '../../utils/translations';
import './CertificateModal.css';

export function CertificateModal({ isOpen, onClose }) {
    const { state, language } = useChallengeContext();
    const certRef = useRef(null);
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = async () => {
        if (!certRef.current || isSharing) return;

        setIsSharing(true);
        const text = t(language, 'certShareText');

        try {
            // Generate PNG Blob from the DOM
            const blob = await toBlob(certRef.current, {
                cacheBust: true,
                backgroundColor: '#060e0a', // Use --bg-deep
                style: { margin: '0' },
            });

            if (!blob) throw new Error("Could not generate image");

            const file = new File([blob], 'tgf-meditation-certificate.png', { type: 'image/png' });

            // Check if Web Share API supports files
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Meditation Certificate',
                    text: text,
                    files: [file],
                });
            } else {
                // Fallback: Download the image directly
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tgf-meditation-certificate.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Copy text as a bonus
                try {
                    await navigator.clipboard.writeText(text);
                    alert(t(language, 'certDownloaded'));
                } catch {
                    alert(t(language, 'certDownloadedNoText'));
                }
            }
        } catch (error) {
            console.error('Failed to share certificate:', error);
            alert(t(language, 'certError'));
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="certificate-modal">
            <div className="certificate-wrapper" ref={certRef}>
                <div className="cert-border">
                    <div className="cert-content">
                        <div className="cert-lotus">🪷</div>
                        <p className="cert-pre">{t(language, 'certCompletion')}</p>
                        <h2 className="cert-title">{t(language, 'certTitle')}</h2>
                        <div className="cert-divider" />
                        <p className="cert-awarded">{t(language, 'certAwardedTo')}</p>
                        <h3 className="cert-name">{state.name || t(language, 'certDefaultName')}</h3>
                        <p className="cert-body">
                            {t(language, 'certBodyText')}
                        </p>
                        <div className="cert-divider" />
                        <p className="cert-date">{formatDate(new Date())}</p>
                        <p className="cert-org">{t(language, 'certOrg')}</p>
                    </div>
                </div>
            </div>
            <div className="cert-actions">
                <Button variant="primary" onClick={handleShare}>
                    {isSharing ? t(language, 'certGeneratingBtn') : t(language, 'certShareBtn')}
                </Button>
                <Button variant="secondary" onClick={onClose}>
                    {t(language, 'certCloseBtn')}
                </Button>
            </div>
        </Modal>
    );
}
