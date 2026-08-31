import landingDocument from '../index.html?raw';
import { StaticDocument } from './html-document';

export default function LandingPage() {
  return <StaticDocument document={landingDocument} />;
}
