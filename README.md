# 📊 Story Point Hesaplayıcı

Sprint planlamalarında işlerin karmaşıklığını, riskini ve eforunu daha tutarlı ve eğlenceli bir şekilde tahmin etmek için geliştirilmiş interaktif bir web aracı.

## 🚀 Özellikler

*   **Detaylı Faktör Analizi:** Hacim (Volume), Karmaşıklık (Complexity) ve Risk faktörlerini ayrı ayrı değerlendirebilme.
*   **Proje Bileşenleri:** Frontend, Backend ve Entegrasyon katmanları için özel kapsam belirleme (örn: "Liste ekranı", "CRUD işlemi").
*   **Otomatik & Akıllı Hesaplama:** Seçilen kriterlere göre **Story Point**, **Adam/Gün** ve **Tahmini Efor (Saat)** hesabı.
*   **Eğlenceli Sonuçlar:** İşin zorluğuna göre dinamik olarak değişen mizahi mesajlar ve avatarlar (😎, ☕, 🤔, 🔥).
*   **Modern Arayüz:** Kullanıcı dostu ikonlar, responsive tasarım ve temiz bir görünüm.

## 🛠️ Kurulum ve Kullanım

Bu proje saf **HTML**, **CSS** ve **JavaScript** kullanılarak geliştirilmiştir. Herhangi bir sunucu kurulumuna veya derlemeye ihtiyaç duymaz.

1.  Proje klasörünü bilgisayarınıza indirin.
2.  `index.html` dosyasını tarayıcınızda (Chrome, Edge, Firefox vb.) açın.
3.  **Hacim**, **Karmaşıklık** ve **Risk** değerlerini seçin veya **Proje Bileşenleri** kısmından detaylı seçim yapın.
4.  **"Tahmini Hesapla"** butonuna basarak sonucu görüntüleyin.

## 🧮 Nasıl Çalışır?

Uygulama arka planda şu mantığı izler:
1.  **Girdi Analizi:** Frontend, Backend ve Entegrasyon seçimleriniz Hacim, Karmaşıklık ve Risk için baz puanlar oluşturur.
2.  **Ağırlıklı Efor:** `Hacim x Karmaşıklık x Risk` formülüyle ham bir iş yükü (saat) hesaplanır.
3.  **Story Point Eşlemesi:** Hesaplanan saat, Fibonacci dizisine (1, 2, 3, 5, 8, 13...) dayalı aralıklara oturtulur.
4.  **Sonuç:** Puan, gün karşılığı ve motive edici (veya düşündürücü 😅) bir mesaj gösterilir.

---
*Keyifli Sprintler!*
