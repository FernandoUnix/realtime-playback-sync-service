package com.example.music.repository;

import com.example.music.model.Song;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SongRepository extends JpaRepository<Song, String>, JpaSpecificationExecutor<Song> {

    List<Song> findByFavoriteTrueOrderByUploadedAtDesc();

    @Query("SELECT DISTINCT s.artist FROM Song s ORDER BY s.artist")
    List<String> findDistinctArtists();

    @Query("SELECT DISTINCT s.album FROM Song s ORDER BY s.album")
    List<String> findDistinctAlbums();

    @Query("SELECT DISTINCT s.genre FROM Song s ORDER BY s.genre")
    List<String> findDistinctGenres();
}
