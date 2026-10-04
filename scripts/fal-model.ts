// Cheapest fal.ai image-to-video model: $0.02 per 5-second clip.
// https://fal.ai/models/fal-ai/ltx-video/image-to-video
// It does not accept duration, resolution, aspect ratio, or audio settings.
export const FAL_CHEAPEST_IMAGE_TO_VIDEO = "fal-ai/ltx-video/image-to-video";

export function falImageToVideoBody(imageUrl: string, prompt: string) {
  return {
    image_url: imageUrl,
    prompt,
  };
}
