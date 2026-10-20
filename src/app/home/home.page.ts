import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';

interface Song {
  name: string;
  artist: string;
  url: string;
  file: File;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
})
export class HomePage implements OnDestroy {
  @ViewChild('audioEl') audioRef!: ElementRef<HTMLAudioElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  playlist: Song[] = [];
  current = -1;
  shuffle = false;
  repeat = false;
  favorites = new Set<Song>();

  searchQuery = '';
  filterFavoritesActive = false;

  currentTime = '0:00';
  duration = '0:00';
  seekValue = 0;
  isPlaying = false;
  status = 'Listo para escuchar';

  constructor(public auth: AuthService) {}

  private get audio(): HTMLAudioElement {
    return this.audioRef.nativeElement;
  }

  // ---------- Helpers ----------
  time(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  get countLabel(): string {
    return `${this.playlist.length} ${this.playlist.length === 1 ? 'canción' : 'canciones'}`;
  }

  get welcomeName(): string {
    return this.auth.user()?.username || 'oyente';
  }

  get visibleSongs(): { song: Song; index: number }[] {
    const q = this.searchQuery.toLowerCase().trim();
    return this.playlist
      .map((song, index) => ({ song, index }))
      .filter(({ song }) => song.name.toLowerCase().includes(q))
      .filter(({ song }) => !this.filterFavoritesActive || this.favorites.has(song));
  }

  get currentSong(): Song | null {
    return this.current >= 0 ? this.playlist[this.current] : null;
  }

  isFavorite(song: Song | null): boolean {
    return song ? this.favorites.has(song) : false;
  }

  // ---------- File picker ----------
  pickFiles(): void {
    this.fileInputRef.nativeElement.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    let added = 0;
    for (const file of files) {
      if (!file.type.startsWith('audio/')) continue;
      this.playlist.push({
        name: file.name.replace(/\.[^.]+$/, ''),
        artist: 'Archivo local',
        url: URL.createObjectURL(file),
        file,
      });
      added++;
    }
    this.status = added
      ? 'Archivos añadidos a tu biblioteca'
      : 'No se seleccionaron archivos';
    input.value = '';
  }

  // ---------- Playback ----------
  async playSong(index: number): Promise<void> {
    if (!this.playlist.length) {
      this.status = 'Primero añade música';
      return;
    }
    this.current = (index + this.playlist.length) % this.playlist.length;
    const song = this.playlist[this.current];

    this.audio.src = song.url;
    this.status = 'Cargando canción…';

    try {
      await this.audio.play();
      this.status = 'Reproduciendo ahora';
    } catch {
      this.status = 'Pulsa reproducir para intentar de nuevo';
    }

    this.updateMediaSession(song);
  }

  async togglePlay(): Promise<void> {
    if (this.current === -1) {
      if (this.playlist.length) await this.playSong(0);
      else this.pickFiles();
    } else if (this.audio.paused) {
      try {
        await this.audio.play();
      } catch {
        this.status = 'No se pudo iniciar la reproducción';
      }
    } else {
      this.audio.pause();
    }
  }

  nextSong(): void {
    if (!this.playlist.length) return;
    let index = this.current + 1;
    if (this.shuffle && this.playlist.length > 1) {
      do {
        index = Math.floor(Math.random() * this.playlist.length);
      } while (index === this.current);
    }
    this.playSong(index);
  }

  prevSong(): void {
    if (!this.playlist.length) return;
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
    } else {
      this.playSong(this.current - 1);
    }
  }

  toggleShuffle(): void {
    this.shuffle = !this.shuffle;
    this.status = this.shuffle
      ? 'Modo aleatorio activado'
      : 'Modo aleatorio desactivado';
  }

  toggleRepeat(): void {
    this.repeat = !this.repeat;
    this.audio.loop = this.repeat;
    this.status = this.repeat
      ? 'Repetición activada'
      : 'Repetición desactivada';
  }

  toggleLikeCurrent(): void {
    const song = this.currentSong;
    if (!song) return;
    this.toggleFavorite(song);
  }

  toggleFavorite(song: Song): void {
    if (this.favorites.has(song)) this.favorites.delete(song);
    else this.favorites.add(song);
  }

  toggleFilterFavorites(): void {
    this.filterFavoritesActive = !this.filterFavoritesActive;
  }

  // ---------- Audio events ----------
  onLoadedMetadata(): void {
    this.duration = this.time(this.audio.duration);
  }

  onTimeUpdate(): void {
    this.currentTime = this.time(this.audio.currentTime);
    this.duration = this.time(this.audio.duration);
    if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
      this.seekValue = (this.audio.currentTime / this.audio.duration) * 1000;
    }
  }

  onSeekInput(): void {
    if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
      this.audio.currentTime = (Number(this.seekValue) / 1000) * this.audio.duration;
    }
  }

  onPlay(): void {
    this.isPlaying = true;
    this.status = 'Reproduciendo ahora';
  }

  onPause(): void {
    this.isPlaying = false;
  }

  onEnded(): void {
    if (!this.repeat) this.nextSong();
  }

  onError(): void {
    this.status = 'No se pudo leer este archivo de audio';
  }

  // ---------- MediaSession ----------
  private updateMediaSession(song: Song): void {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name,
      artist: song.artist,
      album: 'Yoru Music',
    });
    navigator.mediaSession.setActionHandler('play', () => this.audio.play());
    navigator.mediaSession.setActionHandler('pause', () => this.audio.pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.nextSong());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.prevSong());
  }

  // ---------- Navigation tabs ----------
  scrollTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  scrollLibrary(): void {
    document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' });
  }
  scrollPlayer(): void {
    document.getElementById('player')?.scrollIntoView({ behavior: 'smooth' });
  }

  logout(): void {
    this.auth.logout();
  }

  ngOnDestroy(): void {
    this.playlist.forEach(s => URL.revokeObjectURL(s.url));
  }
}