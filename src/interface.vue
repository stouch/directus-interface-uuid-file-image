<template>
	<div class="image">
		<v-skeleton-loader v-if="loading" type="input-tall" />

		<v-notice v-else-if="disabled && !image" class="disabled-placeholder" center icon="block">
			{{ 'disabled' }}
		</v-notice>

		<div v-else-if="image" class="image-preview" :class="{ 'is-svg': image.type && image.type.includes('svg') }">
			<div v-if="imageError" class="image-error">
				<v-icon large :name="imageError === 'UNKNOWN' ? 'error_outline' : 'info_outline'" />

				<span class="message">
					{{ `errors.${imageError}` }}
				</span>
			</div>
			<img v-else :src="src" alt="" role="presentation" @error="imageErrorHandler" />

			<div class="shadow" />

			<div v-if="!disabled" class="actions">
				<v-button v-tooltip="'zoom'" icon rounded @click="lightboxActive = true">
					<v-icon name="zoom_in" />
				</v-button>
				<v-button v-tooltip="'download'" icon rounded :href="downloadSrc" :download="image.filename_download">
					<v-icon name="get_app" />
				</v-button>
				<v-button v-tooltip="'edit'" icon rounded @click="editDrawerActive = true">
					<v-icon name="open_in_new" />
				</v-button>
				<v-button v-tooltip="'deselect'" icon rounded @click="deselect">
					<v-icon name="close" />
				</v-button>
			</div>

			<div class="info">
				<div class="title">{{ image.title }}</div>
				<div class="meta">{{ meta }}</div>
			</div>

			<drawer-item
				v-if="!disabled && image"
				v-model:active="editDrawerActive"
				collection="directus_files"
				:primary-key="image.id"
				:edits="edits"
				@input="stageEdits"
			/>

			<file-lightbox :id="image.id" v-model="lightboxActive" />
		</div>
		<v-upload v-else from-library from-url :folder="folder" @input="setImage" />
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed, PropType } from 'vue';
import { nanoid } from 'nanoid';
import { useApi } from '@directus/extensions-sdk';
import { getRootPath } from './directus/app/src/utils/get-root-path';


function addQueryToPath(path: string, query: Record<string, string>): string {
	const queryParams = [];

	for (const [key, value] of Object.entries(query)) {
		queryParams.push(`${key}=${value}`);
	}

	return path.includes('?') ? `${path}&${queryParams.join('&')}` : `${path}?${queryParams.join('&')}`;
}

function getToken(api: any): string | null {
	return api.defaults.headers.common['Authorization']?.split(' ')[1] || null;
}

function addTokenToURL(api: any, url: string, token?: string): string {
	const accessToken = token || getToken(api);
	if (!accessToken) return url;

	return addQueryToPath(url, { access_token: accessToken });
}

type Image = {
	id: string; // uuid
	type: string;
	filesize: number;
	width: number;
	height: number;
	filename_download: string;
};
export default defineComponent({
	components: {},
	props: {
		value: {
			type: [String, Object] as PropType<string | Record<string, any>>,
			default: null,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		folder: {
			type: String,
			default: undefined,
		},
        file_key_to_get: {
			type: String,
			default: "filename_disk",
		}
	},
	emits: ['input'],
	setup(props, {emit}) {
		const loading = ref(false);
		const image = ref<Image | null>(null);
		const lightboxActive = ref(false);
		const editDrawerActive = ref(false);
		const imageError = ref<string | null>(null);
		const cacheBuster = ref(nanoid());

		const api = useApi();

		const src = computed(() => {
			if (!image.value) return null;
			if (image.value.type.includes('svg')) {
				return addTokenToURL(api, getRootPath() + `assets/${image.value.id}`);
			}
			if (image.value.type.includes('image')) {
				const url = getRootPath() + `assets/${image.value.id}?key=system-large-cover&cache-buster=${cacheBuster.value}`;
				return addTokenToURL(api, url);
			}
			return null;
		});
		const downloadSrc = computed(() => {
			if (!image.value) return null;
			return addTokenToURL(api, getRootPath() + `assets/${image.value.id}`);
		});
		const meta = computed(() => {
			if (!image.value) return null;
			const { filesize, width, height, type } = image.value;
			if (width && height) {
				return `${width}x${height} • ${filesize} • ${type}`;
			}
			return `${filesize} • ${type}`;
		});
		watch(
			() => props.value,
			(newValue, oldValue) => {
				if (newValue === oldValue) return;
				if (newValue) {
					fetchImage();
				}
				if (oldValue && newValue === null) {
					deselect();
				}
			},
			{ immediate: true }
		);
		const { edits, stageEdits } = useEdits();

		return {
			// t,
			loading,
			image,
			src,
			imageError,
			imageErrorHandler,
			meta,
			lightboxActive,
			editDrawerActive,
			changeCacheBuster,
			setImage,
			deselect,
			downloadSrc,
			edits,
			stageEdits,
		};
		async function fetchImage() {
			loading.value = true;
			try {
				let id = typeof props.value === 'string' ? props.value : props.value?.id;

				// Trick to handle the case when file_key_to_get is `filename_disk`
				id = id.split('.').slice(0, -1).join('.');

				const response = await api.get(`/files/${id}`, {
					params: {
						fields: ['id', 'title', 'width', 'height', 'filesize', 'type', 'filename_download'],
					},
				});
				if (props.value !== null && typeof props.value === 'object') {
					image.value = {
						...response.data.data,
						...props.value,
					};
				} else {
					image.value = response.data.data;
				}
			} catch (err: any) {
				// unexpectedError(err);
				console.log(err);
			} finally {
				loading.value = false;
			}
		}
		async function imageErrorHandler() {
			if (!src.value) return;
			try {
				await api.get(src.value);
			} catch (err: any) {
				imageError.value = err.response?.data?.errors[0]?.extensions?.code;
				if (!imageError.value /*|| !te('errors.' + imageError.value)*/) {
					imageError.value = 'UNKNOWN';
				}
			}
		}
		function changeCacheBuster() {
			cacheBuster.value = nanoid();
		}
		function setImage(data: Image) {
			console.log('setImage', data)
			image.value = data;
			emit('input', data[props.file_key_to_get]);
		}
		function deselect() {
			emit('input', null);
			loading.value = false;
			image.value = null;
			lightboxActive.value = false;
			editDrawerActive.value = false;
		}
		function useEdits() {
			const edits = computed(() => {
				// If the current value isn't a primitive, it means we've already staged some changes
				// This ensures we continue on those changes instead of starting over
				if (props.value && typeof props.value === 'object') {
					return props.value;
				}
				return {};
			});
			return { edits, stageEdits };
			function stageEdits(newEdits: Record<string, any>) {
				if (!image.value) return;

				console.log(newEdits);

				emit('input', image.value[props.file_key_to_get]);
				/*
				emit('input', {
					id: image.value.id,
					...newEdits,
				}); */
			}
		}
	},
});
</script>

<style lang="scss" scoped>
.image-preview {
	position: relative;
	width: 100%;
	height: var(--input-height-tall);
	overflow: hidden;
	background-color: var(--background-subdued);
	border-radius: var(--border-radius);
}
img {
	z-index: 1;
	width: 100%;
	height: 100%;
	object-fit: cover;
}
.is-svg {
	padding: 32px;
	background-color: var(--background-normal-alt);
	img {
		object-fit: contain;
	}
}
.image-error {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	// width: 100%;
	height: 100%;
	color: var(--foreground-subdued);
	background-color: var(--background-normal);
	.v-icon {
		margin-bottom: 6px;
	}
	.message {
		max-width: 300px;
		padding: 0 16px;
		text-align: center;
	}
}
.shadow {
	position: absolute;
	bottom: 0;
	left: 0;
	z-index: 2;
	width: 100%;
	height: 40px;
	overflow: hidden;
	line-height: 1;
	white-space: nowrap;
	text-overflow: ellipsis;
	background: linear-gradient(180deg, rgba(38, 50, 56, 0) 0%, rgba(38, 50, 56, 0.25) 100%);
	transition: height var(--fast) var(--transition);
}
.actions {
	--v-button-color: var(--foreground-subdued);
	--v-button-background-color: var(--white);
	--v-button-color-hover: var(--foreground-normal);
	--v-button-background-color-hover: var(--white);
	position: absolute;
	top: 30%;
	left: 0;
	z-index: 3;
	display: flex;
	justify-content: center;
	width: 100%;
	.v-button {
		margin-right: 12px;
		transform: translateY(10px);
		opacity: 0;
		transition: var(--medium) var(--transition);
		transition-property: opacity transform;
		@for $i from 0 through 4 {
			&:nth-of-type(#{$i + 1}) {
				transition-delay: $i * 25ms;
			}
		}
	}
	.v-button:last-child {
		margin-right: 0px;
	}
}
.info {
	position: absolute;
	bottom: 0;
	left: 0;
	z-index: 3;
	width: 100%;
	padding: 8px 12px;
	line-height: 1.2;
}
.title {
	color: var(--white);
}
.meta {
	height: 17px;
	max-height: 0;
	overflow: hidden;
	color: rgba(255, 255, 255, 0.75);
	transition: max-height var(--fast) var(--transition);
}
.image-preview:hover {
	.shadow {
		height: 100%;
		background: linear-gradient(180deg, rgba(38, 50, 56, 0) 0%, rgba(38, 50, 56, 0.5) 100%);
	}
	.actions .v-button {
		transform: translateY(0px);
		opacity: 1;
	}
	.meta {
		max-height: 17px;
	}
}
.disabled-placeholder {
	height: var(--input-height-tall);
}
</style>