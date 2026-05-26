import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Camera, CheckCircle2, Image, Loader2, Play, Sparkles, Shirt, Upload, WandSparkles } from "lucide-react";
import { ProductCard } from "../components/ProductCard";
import { api, mapProduct } from "../lib/api";

const metaEnv = (import.meta as any).env as { DEV?: boolean; VITE_BACKEND_URL?: string } | undefined;
const BACKEND_URL = metaEnv?.DEV ? "" : (metaEnv?.VITE_BACKEND_URL ?? "");
const USER_ID = "guest";
const occasionOptions = ["casual", "formal", "party", "business", "outing", "evening", "sports"];

const getEngineLabel = (model: string) => {
  if (!model) return "Ready";
  const m = model.toLowerCase();
  if (m === "ai_styled_preview" || m === "standard" || m === "default") return "AI Styled Preview";
  if (m === "hf_kontext_lora" || m === "hf") return "AI Cloud Refined";
  if (m === "advanced_vton" || m === "advanced") return "AI Advanced Blend";
  if (m === "catvton") return "AI Classic Blend";
  return "AI Styled Preview";
};

type ClothingAnalysis = {
  category?: string;
  style?: string;
  primary_color?: string;
  tags?: string[];
  [key: string]: unknown;
};

const TryOnPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bodyFile, setBodyFile] = useState<File | null>(null);
  const [clothingFile, setClothingFile] = useState<File | null>(null);
  const [bodyPreview, setBodyPreview] = useState<string>("");
  const [clothingPreview, setClothingPreview] = useState<string>("");
  const [clothingImageUrl, setClothingImageUrl] = useState<string>("");
  const [clothingName, setClothingName] = useState<string>("");
  const [tryonResult, setTryonResult] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [occasion, setOccasion] = useState<string>("casual");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isSavingSample, setIsSavingSample] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [savedSample, setSavedSample] = useState<any | null>(null);
  const [wardrobeMatches, setWardrobeMatches] = useState<any[]>([]);
  const [productMatches, setProductMatches] = useState<any[]>([]);
  const [clothingAnalysis, setClothingAnalysis] = useState<ClothingAnalysis | null>(null);
  const [resultModel, setResultModel] = useState<string>("");

  const canGenerate = useMemo(
    () => Boolean(bodyFile && (clothingFile || clothingImageUrl)),
    [bodyFile, clothingFile, clothingImageUrl]
  );

  useEffect(() => {
    return () => {
      if (bodyPreview) URL.revokeObjectURL(bodyPreview);
    };
  }, [bodyPreview]);

  useEffect(() => {
    return () => {
      if (clothingPreview) URL.revokeObjectURL(clothingPreview);
    };
  }, [clothingPreview]);

  const handleFileChange = (file: File | null, setter: typeof setBodyFile, previewSetter: typeof setBodyPreview) => {
    setter(file);
    if (!file) {
      previewSetter("");
      if (setter === setBodyFile) {
        localStorage.removeItem("stylesync_saved_body_base64");
      }
      return;
    }
    previewSetter(URL.createObjectURL(file));

    if (setter === setBodyFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          localStorage.setItem("stylesync_saved_body_base64", reader.result as string);
        } catch (e) {
          console.warn("Failed to cache body image in localStorage:", e);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Load cached body photo on mount
  useEffect(() => {
    const savedBody = localStorage.getItem("stylesync_saved_body_base64");
    if (savedBody) {
      setBodyPreview(savedBody);
      fetch(savedBody)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "cached_body.png", { type: "image/png" });
          setBodyFile(file);
        })
        .catch((err) => console.error("Error restoring cached body image:", err));
    }
  }, []);

  // Parse clothing details from search query
  useEffect(() => {
    const urlParam = searchParams.get("clothing_url");
    const nameParam = searchParams.get("clothing_name");
    if (urlParam) {
      setClothingImageUrl(urlParam);
      setClothingPreview(urlParam);
      setClothingFile(null); // Clear local uploaded file since we have URL
    }
    if (nameParam) {
      setClothingName(nameParam);
    }
  }, [searchParams]);

  // Autogenerate effect
  useEffect(() => {
    const autoGen = searchParams.get("autogenerate") === "true";
    if (autoGen && bodyFile && (clothingFile || clothingImageUrl) && !isGenerating && !tryonResult) {
      // Clear autogenerate param so we don't trigger it again on subsequent updates
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("autogenerate");
      setSearchParams(nextParams, { replace: true });

      // Run generation
      generateTryOn();
    }
  }, [bodyFile, clothingFile, clothingImageUrl, searchParams, isGenerating, tryonResult]);

  const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

  const postForm = async (endpoint: string, formData: FormData) => {
    const response = await fetch(`${BACKEND_URL}/api/${endpoint}`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Server error");
    }
    return response.json();
  };

  const generateTryOn = async () => {
    if (!canGenerate) {
      setStatusMessage("Upload both a body photo and a clothing photo first.");
      return;
    }

    setIsGenerating(true);
    setStatusMessage("Generating your try-on...");
    try {
      if (!bodyFile || (!clothingFile && !clothingImageUrl)) {
        throw new Error("Missing uploaded files or image URL.");
      }

      const selectedBodyFile = bodyFile;

      const formData = new FormData();
      formData.append("user_id", USER_ID);
      formData.append("occasion", occasion);
      formData.append("body_image", selectedBodyFile);
      
      if (clothingFile) {
        formData.append("clothing_image", clothingFile);
      } else if (clothingImageUrl) {
        formData.append("clothing_image_url", clothingImageUrl);
      }

      const result = await postForm("tryon/predict", formData);
      setTryonResult(result.tryon_image ? `data:image/png;base64,${result.tryon_image}` : "");
      setResultModel(result.model || "ai_styled_preview");
      setSavedSample(result.saved_sample || null);
      setClothingAnalysis(result.clothing_analysis || null);

      const recommendationMessage = result.recommendations?.message ? ` ${result.recommendations.message}` : "";
      if (result.clothing_analysis) {
        setStatusMessage(
          `AI Styled Preview completed. Detected ${result.clothing_analysis.category || "item"} in ${result.clothing_analysis.style || "a clean silhouette"}.${recommendationMessage}`
        );
      } else {
        setStatusMessage(`AI Styled Preview completed.${recommendationMessage}`);
      }

      if (result.recommendations) {
        setWardrobeMatches(result.recommendations.wardrobe_matches || []);
        setProductMatches((result.recommendations.external_matches || []).map(mapProduct));
      } else {
        setWardrobeMatches([]);
        setProductMatches([]);
      }

      if (result.history_record) {
        console.log("Try-on history record saved:", result.history_record);
      }
    } catch (error) {
      setStatusMessage(`Failed to generate try-on: ${getErrorMessage(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadOccasionRecommendations = async () => {
    if (!clothingFile && !clothingImageUrl) {
      setStatusMessage("Upload a clothing image first to get occasion-based matches.");
      return;
    }

    setIsMatching(true);
    setStatusMessage(`Finding ${occasion} matches...`);
    try {
      const result = await api.getOutfitRecommendations({
        user_id: USER_ID,
        occasion,
        category: "topwear",
        tags: ["topwear"],
        limit: 6,
      });

      setWardrobeMatches(result.wardrobe_matches || []);
      setProductMatches((result.external_matches || []).map(mapProduct));
      setStatusMessage(result.message || "Recommendations loaded.");
    } catch (error) {
      setStatusMessage(`Failed to load recommendations: ${getErrorMessage(error)}`);
      setWardrobeMatches([]);
      setProductMatches([]);
    } finally {
      setIsMatching(false);
    }
  };

  const saveDatasetSample = async () => {
    if (!canGenerate) {
      setStatusMessage("Upload both images before saving a sample.");
      return;
    }

    setIsSavingSample(true);
    setStatusMessage("Saving sample for future training...");
    try {
      if (!bodyFile || (!clothingFile && !clothingImageUrl)) {
        throw new Error("Missing uploaded files or image URL.");
      }

      const selectedBodyFile = bodyFile;

      const formData = new FormData();
      formData.append("user_id", "guest");
      formData.append("category", "topwear");
      formData.append("body_image", selectedBodyFile);
      if (clothingFile) {
        formData.append("clothing_image", clothingFile);
      } else if (clothingImageUrl) {
        formData.append("clothing_image_url", clothingImageUrl);
      }
      const result = await postForm("tryon/save-sample", formData);
      setStatusMessage(`Sample saved: ${result.sample_id}`);
    } catch (error) {
      setStatusMessage(`Failed to save sample: ${getErrorMessage(error)}`);
    } finally {
      setIsSavingSample(false);
    }
  };

  const startTraining = async () => {
    setIsTraining(true);
    setStatusMessage("Starting training run...");
    try {
      const response = await fetch(`${BACKEND_URL}/api/tryon/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epochs: 3, batch_size: 2, learning_rate: 0.001 }),
      });
      const result = await response.json();
      setStatusMessage(result.message || JSON.stringify(result));
    } catch (error) {
      setStatusMessage(`Training error: ${getErrorMessage(error)}`);
    } finally {
      setIsTraining(false);
    }
  };

  const previewSummary = [
    { label: "Body photo", value: bodyFile ? bodyFile.name : (localStorage.getItem("stylesync_saved_body_base64") ? "Cached body photo" : "No file selected") },
    { label: "Garment photo", value: clothingFile ? clothingFile.name : (clothingName ? clothingName : (clothingImageUrl ? "Selected from shop" : "No file selected")) },
    { label: "Occasion", value: occasion },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(348_83%_47%_/_0.08),transparent_35%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]">
      <div className="container py-8 md:py-10">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-[2rem] border border-border bg-card/85 backdrop-blur-xl p-6 md:p-8 shadow-product"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <WandSparkles className="w-3.5 h-3.5" /> Virtual Try-On Studio
              </span>
              <h1 className="mt-4 font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                Upload two photos, then see the look on a model-style preview.
              </h1>
              <p className="mt-3 max-w-2xl text-sm md:text-base text-muted-foreground">
                This keeps your current backend pipeline, but presents it as a guided fitting room: upload a body image,
                choose a garment, generate the try-on, and browse matching pieces in one flow.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              {[
                { label: "Step 1", value: "Upload" },
                { label: "Step 2", value: "Generate" },
                { label: "Step 3", value: "Shop" },
              ].map((step) => (
                <div key={step.label} className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-center">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{step.label}</div>
                  <div className="mt-1 font-semibold text-foreground">{step.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              "Body image for the person",
              "Garment image for the product",
              "Occasion-aware matches and training samples",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <motion.label
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="group cursor-pointer overflow-hidden rounded-[2rem] border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-product-hover"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <Upload className="w-3.5 h-3.5" /> Body image
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-foreground">Upload your body photo</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Use a clear full or half body photo for the best result.</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-muted p-3 text-primary">
                    <Image className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-dashed border-border bg-background/80">
                  {bodyPreview ? (
                    <img src={bodyPreview} alt="Body preview" className="h-56 w-full object-cover transition-all duration-300 hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-56 flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      <div className="rounded-full bg-muted p-3 text-primary">
                        <Camera className="w-5 h-5" />
                      </div>
                      <p className="mt-3 font-medium text-foreground">Drop or select a body photo</p>
                      <p className="mt-1">PNG, JPG, JPEG supported.</p>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => handleFileChange(event.target.files?.[0] ?? null, setBodyFile, setBodyPreview)}
                />
              </motion.label>

              <motion.label
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group cursor-pointer overflow-hidden rounded-[2rem] border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-product-hover"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <Shirt className="w-3.5 h-3.5" /> Garment image
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-foreground">Upload the clothing item</h2>
                    <p className="mt-1 text-sm text-muted-foreground">The backend will analyze the garment and generate matches.</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-muted p-3 text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-dashed border-border bg-background/80">
                  {clothingPreview ? (
                    <img src={clothingPreview} alt="Clothing preview" className="h-56 w-full object-cover transition-all duration-300 hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-56 flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      <div className="rounded-full bg-muted p-3 text-primary">
                        <Shirt className="w-5 h-5" />
                      </div>
                      <p className="mt-3 font-medium text-foreground">Drop or select a garment image</p>
                      <p className="mt-1">Front-facing product shots work best.</p>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => handleFileChange(event.target.files?.[0] ?? null, setClothingFile, setClothingPreview)}
                />
              </motion.label>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-[2rem] border border-border bg-card p-5 shadow-product"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Studio composition</p>
                    <p className="text-xs text-muted-foreground">A quick visual check before generation.</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Live preview
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="overflow-hidden rounded-[1.5rem] border border-border bg-background">
                    {bodyPreview ? (
                      <img src={bodyPreview} alt="Selected body preview" className="h-56 w-full object-cover transition-all duration-300 hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">Body photo preview</div>
                    )}
                  </div>
                  <div className="overflow-hidden rounded-[1.5rem] border border-border bg-background">
                    {clothingPreview ? (
                      <img src={clothingPreview} alt="Selected clothing preview" className="h-56 w-full object-cover transition-all duration-300 hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">Clothing preview</div>
                    )}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-[2rem] border border-border bg-card p-5 shadow-product"
              >
                <p className="text-sm font-semibold text-foreground">Current setup</p>
                <div className="mt-4 space-y-3">
                  {previewSummary.map((entry) => (
                    <div key={entry.label} className="rounded-[1.5rem] border border-border bg-background px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{entry.label}</div>
                      <div className="mt-1 truncate text-sm font-medium text-foreground">{entry.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                  {canGenerate ? (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 w-4 h-4 text-emerald-500" />
                      <p>Ready to generate. The try-on result will appear in the preview panel to the right.</p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <Loader2 className="mt-0.5 w-4 h-4 animate-spin text-primary" />
                      <p>Upload both images to unlock generation, recommendations, and sample saving.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-[2rem] border border-border bg-card p-5 shadow-product"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Occasion and actions</p>
                  <p className="text-xs text-muted-foreground">Use the same backend, but guide the user through a cleaner fitting-room flow.</p>
                </div>

                 <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 rounded-[1.5rem] border border-border bg-background px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Occasion</span>
                    <select
                      value={occasion}
                      onChange={(event) => setOccasion(event.target.value)}
                      className="bg-transparent text-sm font-medium text-foreground outline-none animate-none"
                    >
                      {occasionOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={generateTryOn}
                      disabled={!canGenerate || isGenerating}
                      className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Generate look
                    </button>
                    <button
                      onClick={loadOccasionRecommendations}
                      disabled={!(clothingFile || clothingImageUrl) || isMatching}
                      className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-all duration-300 hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Find matches
                    </button>
                    <button
                      onClick={saveDatasetSample}
                      disabled={!canGenerate || isSavingSample}
                      className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-all duration-300 hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingSample ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      Save sample
                    </button>
                    <button
                      onClick={startTraining}
                      disabled={isTraining}
                      className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] border border-primary/20 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition-all duration-300 hover:bg-primary/15 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isTraining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Train model
                    </button>
                  </div>
                </div>
              </div>

              {statusMessage && (
                <div className="mt-4 rounded-[1.5rem] border border-border bg-background px-4 py-3 text-sm text-muted-foreground transition-all duration-300">
                  {statusMessage}
                </div>
              )}

              {savedSample && (
                <div className="mt-4 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 transition-all duration-300">
                  Saved sample {savedSample.sample_id} for {savedSample.category || "unknown"}.
                </div>
              )}
            </motion.div>
          </div>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="h-fit rounded-[2rem] border border-border bg-card p-5 shadow-product lg:sticky lg:top-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <WandSparkles className="w-3.5 h-3.5" /> Live Preview
                </div>
                <h2 className="mt-3 text-2xl font-display font-bold text-foreground">AI Styled Preview</h2>
              </div>
              <div className="rounded-2xl border border-border bg-background px-3 py-2 text-right shadow-sm">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Engine</div>
                <div className="text-sm font-bold text-primary">{getEngineLabel(resultModel)}</div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[2rem] border border-border bg-background shadow-inner relative group transition-all duration-300">
              {isGenerating ? (
                <div className="flex h-[520px] flex-col items-center justify-center px-8 text-center bg-muted/20 animate-pulse">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <div className="absolute w-16 h-16 border-4 border-dashed border-primary/40 rounded-full animate-[spin_3s_linear_infinite_reverse]" />
                    <div className="rounded-full bg-primary/10 p-5 text-primary relative z-10">
                      <WandSparkles className="w-8 h-8 animate-bounce" />
                    </div>
                  </div>
                  <p className="mt-8 text-xl font-display font-bold text-foreground tracking-tight animate-bounce">Generating AI Fit...</p>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                    Our AI models are removing backgrounds, aligning shoulders, and styling the garment onto your figure.
                  </p>
                  <div className="mt-6 flex gap-1.5 justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-[bounce_1.4s_infinite_0s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-[bounce_1.4s_infinite_0.2s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-[bounce_1.4s_infinite_0.4s]" />
                  </div>
                </div>
              ) : tryonResult ? (
                <div className="relative overflow-hidden w-full h-[520px] bg-background flex items-center justify-center rounded-[2rem]">
                  <img 
                    id="j0qqc0"
                    src={tryonResult} 
                    alt="AI Styled Preview" 
                    className="h-full w-full object-contain transition-all duration-500 hover:scale-[1.01]"
                    style={{ 
                      objectFit: 'contain',
                      imageRendering: 'auto',
                      filter: 'contrast(1.04) saturate(1.02) brightness(1.01)',
                      WebkitFilter: 'contrast(1.04) saturate(1.02) brightness(1.01)'
                    }} 
                  />
                  <div id="2k4e0q" className="absolute bottom-4 left-4 rounded-xl bg-background/90 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-foreground border border-border shadow-sm flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                    AI Styled Preview
                  </div>
                </div>
              ) : (
                <div className="flex h-[520px] flex-col items-center justify-center px-8 text-center rounded-[2rem]">
                  <div className="rounded-full bg-primary/10 p-4 text-primary">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-foreground">Your styled preview lands here</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Upload a body photo and garment image, then generate to see the result.
                  </p>
                </div>
              )}
            </div>

            {/* Side-by-side preview section */}
            {tryonResult && !isGenerating && (
              <div className="mt-5 space-y-3 rounded-[2rem] border border-border bg-muted/10 p-4 shadow-sm transition-all duration-300 hover:shadow-product">
                <p className="text-xs font-bold text-foreground tracking-wide uppercase">Fitting Room Side-by-Side</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground text-center truncate">Your Photo</span>
                    <div className="overflow-hidden rounded-[1.5rem] border border-border aspect-[3/4] bg-background">
                      <img src={bodyPreview} alt="Original Body" className="h-full w-full object-cover transition-all duration-300 hover:scale-[1.05]" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground text-center truncate">Garment</span>
                    <div className="overflow-hidden rounded-[1.5rem] border border-border aspect-[3/4] bg-background">
                      <img src={clothingPreview} alt="Garment" className="h-full w-full object-cover transition-all duration-300 hover:scale-[1.05]" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-wider text-primary text-center font-bold truncate">AI Styled</span>
                    <div className="overflow-hidden rounded-[1.5rem] border border-primary/20 aspect-[3/4] bg-primary/5">
                      <img src={tryonResult} alt="AI Result" className="h-full w-full object-cover transition-all duration-300 hover:scale-[1.05]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {clothingAnalysis && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-[1.5rem] border border-border bg-background px-4 py-3 transition-all duration-300 hover:shadow-sm">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Category</div>
                  <div className="mt-1 font-semibold text-foreground">{clothingAnalysis.category || "Unknown"}</div>
                </div>
                <div className="rounded-[1.5rem] border border-border bg-background px-4 py-3 transition-all duration-300 hover:shadow-sm">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Style</div>
                  <div className="mt-1 font-semibold text-foreground">{clothingAnalysis.style || "Unknown"}</div>
                </div>
                <div className="rounded-[1.5rem] border border-border bg-background px-4 py-3 transition-all duration-300 hover:shadow-sm">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Color</div>
                  <div className="mt-1 font-semibold text-foreground">{clothingAnalysis.primary_color || "Unknown"}</div>
                </div>
                <div className="rounded-[1.5rem] border border-border bg-background px-4 py-3 transition-all duration-300 hover:shadow-sm">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Tags</div>
                  <div className="mt-1 font-semibold text-foreground">{clothingAnalysis.tags?.length || 0}</div>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-[1.5rem] border border-border bg-muted/20 p-4 shadow-sm transition-all duration-300 hover:shadow-product">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                AI Fitting Studio Features
              </div>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground leading-relaxed">
                <p className="flex items-center gap-2">• <strong className="text-foreground">Torso-Fit Alignment:</strong> Automatically aligns shoulders and necklines.</p>
                <p className="flex items-center gap-2">• <strong className="text-foreground">AI Fabric Folding:</strong> Refines lighting and fold composition dynamically.</p>
                <p className="flex items-center gap-2">• <strong className="text-foreground">Smart Curated Matches:</strong> Instantly recommends matches from your wardrobe.</p>
              </div>
            </div>
          </motion.aside>
        </div>

        {(wardrobeMatches.length > 0 || productMatches.length > 0) && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 space-y-6"
          >
            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-product">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Recommendation results</p>
                  <p className="text-xs text-muted-foreground">The generated look is paired with wardrobe and shopping matches below.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{wardrobeMatches.length} wardrobe matches</span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{productMatches.length} shopping matches</span>
                </div>
              </div>

              {wardrobeMatches.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">From your wardrobe</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {wardrobeMatches.slice(0, 4).map((item) => (
                      <div key={item.id} className="overflow-hidden rounded-[1.5rem] border border-border bg-background transition-all duration-300 hover:shadow-product hover:scale-[1.03] group">
                        <img
                          src={item.image_url || item.image || clothingPreview}
                          alt={item.name || item.title || "Wardrobe match"}
                          className="aspect-[4/5] w-full object-cover transition-all duration-500 group-hover:scale-105"
                        />
                        <div className="p-3">
                          <p className="truncate text-sm font-medium text-foreground">{item.name || item.title || "Wardrobe item"}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Matched from your wardrobe</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {productMatches.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Shop matching products</h3>
                  <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {productMatches.slice(0, 6).map((product, index) => (
                      <ProductCard key={product.id} product={product} index={index} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default TryOnPage;