// frontend/src/components/PrivacyPolicy.js
import React from 'react';
import '../css/PrivacyPolicy.css'; // Import the CSS for styling

const PrivacyPolicy = () => {
  return (
    <div className="policy-container">
      <h1 className="policy-title">Privacy Policy for AtlasCore</h1>

      <p className="policy-last-updated"><strong>Last Updated:</strong> July 11, 2025</p>

      <p>Welcome to AtlasCore! This Privacy Policy describes how AtlasCore ("we," "us," or "our") collects, uses, and shares your personal information when you use our website and services, including our Minecraft server and online store (collectively, the "Services").</p>

      <p>By accessing or using our Services, you agree to the collection and use of information in accordance with this policy. If you do not agree with the terms of this Privacy Policy, please do not access or use the Services.</p>

      <h2 className="policy-section-heading">1. Information We Collect</h2>
      <p>We collect various types of information to provide and improve our Services to you.</p>

      <h3 className="policy-sub-section-heading">a. Personal Data</h3>
      <p>While using our Services, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personal Data may include, but is not limited to:</p>
      <ul>
        <li><strong>Account Information:</strong> Username, email address, and hashed password.</li>
        <li><strong>Minecraft Account Information:</strong> Your Minecraft username and UUID (Universally Unique Identifier) when you link your account.</li>
        <li><strong>Order Information:</strong> Details of products or services you purchase through our store, including transaction IDs, total amount, payment method, and product details.</li>
        <li><strong>Communication Data:</strong> Any information you provide when you contact us for support, inquiries, or feedback.</li>
      </ul>

      <h3 className="policy-sub-section-heading">b. Non-Personal Data</h3>
      <p>We may also collect information that does not directly identify you. This may include:</p>
      <ul>
        <li><strong>Server Statistics:</strong> Anonymous data about server activity, such as online player counts, new player registrations (aggregated), and general server status. This data is used for monitoring and improving server performance.</li>
        <li><strong>Usage Data:</strong> Information about how you access and use the website, such as your IP address, browser type, operating system, referral URLs, pages viewed, and the time and date of your visits.</li>
        <li><strong>Cookies and Tracking Technologies:</strong> We use cookies and similar tracking technologies to track activity on our Service and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.</li>
      </ul>

      <h2 className="policy-section-heading">2. How We Use Your Information</h2>
      <p>AtlasCore uses the collected data for various purposes:</p>
      <ul>
        <li><strong>To Provide and Maintain our Services:</strong> This includes managing your user account, processing your orders, and delivering in-game items.</li>
        <li><strong>To Improve our Services:</strong> We use data to understand how our Services are used, identify areas for improvement, and develop new features.</li>
        <li><strong>To Personalize Your Experience:</strong> To tailor the Services to your preferences, such as displaying relevant products or character stats.</li>
        <li><strong>To Communicate with You:</strong> To send you important updates, security alerts, and support messages.</li>
        <li><strong>To Ensure Security:</strong> To detect, prevent, and address technical issues or fraudulent activities.</li>
        <li><strong>For Internal Analytics:</strong> To perform data analysis, identify usage trends, and evaluate the effectiveness of our campaigns.</li>
        <li><strong>To Comply with Legal Obligations:</strong> To meet any applicable laws, regulations, or legal processes.</li>
      </ul>

      <h2 className="policy-section-heading">3. How We Share Your Information</h2>
      <p>We may share your information in the following situations:</p>
      <ul>
        <li><strong>With Service Providers:</strong> We may employ third-party companies and individuals to facilitate our Services (e.g., payment processors, hosting providers, analytics services). These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.</li>
        <li><strong>For Business Transfers:</strong> If AtlasCore is involved in a merger, acquisition, or asset sale, your Personal Data may be transferred. We will provide notice before your Personal Data is transferred and becomes subject to a different Privacy Policy.</li>
        <li><strong>For Legal Reasons:</strong> We may disclose your Personal Data in the good faith belief that such action is necessary to:
          <ul>
            <li>Comply with a legal obligation.</li>
            <li>Protect and defend the rights or property of AtlasCore.</li>
            <li>Prevent or investigate possible wrongdoing in connection with the Service.</li>
            <li>Protect the personal safety of users of the Service or the public.</li>
            <li>Protect against legal liability.</li>
          </ul>
        </li>
        <li><strong>With Your Consent:</strong> We may disclose your personal information for any other purpose with your explicit consent.</li>
      </ul>

      <h2 className="policy-section-heading">4. Data Security</h2>
      <p>The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security. We implement various security measures, including encryption and access controls, to protect your data.</p>

      <h2 className="policy-section-heading">5. Your Data Protection Rights</h2>
      <p>Depending on your location, you may have the following data protection rights:</p>
      <ul>
        <li><strong>The right to access:</strong> You have the right to request copies of your Personal Data.</li>
        <li><strong>The right to rectification:</strong> You have the right to request that we correct any information you believe is inaccurate or complete information you believe is incomplete.</li>
        <li><strong>The right to erasure:</strong> You have the right to request that we erase your Personal Data, under certain conditions.</li>
        <li><strong>The right to restrict processing:</strong> You have the right to request that we restrict the processing of your Personal Data, under certain conditions.</li>
        <li><strong>The right to object to processing:</strong> You have the right to object to our processing of your Personal Data, under certain conditions.</li>
        <li><strong>The right to data portability:</strong> You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.</li>
      </ul>
      <p>If you make a request, we have one month to respond to you. To exercise any of these rights, please contact us using the details provided in the "Contact Us" section below.</p>

      <h2 className="policy-section-heading">6. Third-Party Links</h2>
      <p>Our Service may contain links to other sites that are not operated by us. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.</p>

      <h2 className="policy-section-heading">7. Changes to This Privacy Policy</h2>
      <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top of this Privacy Policy. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>

      <h2 className="policy-section-heading">8. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, please contact us:</p>
      <ul>
        <li>By email: support@atlascore.net</li>
        <li>By visiting this page on our website: [Your Contact Page URL, e.g., /contact]</li>
      </ul>
    </div>
  );
};

export default PrivacyPolicy;
