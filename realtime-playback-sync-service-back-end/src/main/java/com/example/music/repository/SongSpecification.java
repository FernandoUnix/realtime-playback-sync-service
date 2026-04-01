package com.example.music.repository;

import com.example.music.model.Song;
import org.springframework.data.jpa.domain.Specification;

public class SongSpecification {

    private SongSpecification() {}

    public static Specification<Song> withFilters(String search, String artist, String album, String genre, Boolean favorite) {
        return Specification
                .where(hasSearch(search))
                .and(hasArtist(artist))
                .and(hasAlbum(album))
                .and(hasGenre(genre))
                .and(hasFavorite(favorite));
    }

    private static Specification<Song> hasSearch(String search) {
        if (search == null || search.isBlank()) return null;
        String pattern = "%" + search.toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("title")),  pattern),
                cb.like(cb.lower(root.get("artist")), pattern),
                cb.like(cb.lower(root.get("album")),  pattern)
        );
    }

    private static Specification<Song> hasArtist(String artist) {
        if (artist == null || artist.isBlank()) return null;
        return (root, query, cb) -> cb.equal(cb.lower(root.get("artist")), artist.toLowerCase());
    }

    private static Specification<Song> hasAlbum(String album) {
        if (album == null || album.isBlank()) return null;
        return (root, query, cb) -> cb.equal(cb.lower(root.get("album")), album.toLowerCase());
    }

    private static Specification<Song> hasGenre(String genre) {
        if (genre == null || genre.isBlank()) return null;
        return (root, query, cb) -> cb.equal(cb.lower(root.get("genre")), genre.toLowerCase());
    }

    private static Specification<Song> hasFavorite(Boolean favorite) {
        if (favorite == null) return null;
        return (root, query, cb) -> cb.equal(root.get("favorite"), favorite);
    }
}
