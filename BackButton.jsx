import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ fallback = "/", label = "Voltar" }) {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-1.5 h-10 pr-3 -ml-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="w-5 h-5" />
      <span className="label-mono text-[0.6875rem]">{label}</span>
    </button>
  );
}