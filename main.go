package main

import (
	"bufio"
	"encoding/json"
	"html/template"
	"io/ioutil"
	"log"
	"os"
	"strings"
	"time"

	"github.com/Depado/bfchroma"
	"github.com/otiai10/copy"
	"gopkg.in/russross/blackfriday.v2"
)

type post struct {
	Folder         string
	Title          string `json:"title"`
	Created        int64  `json:"ts"`
	CreatedDisplay string
	Content        template.HTML
}

type shell struct {
	Posts *[]post
	Index *[]post
}

func main() {
	err := cleanOutput()
	if err != nil {
		log.Fatalln(err)
	}

	err = copyStatic()
	if err != nil {
		log.Fatalln(err)
	}

	posts, err := collectPosts()
	if err != nil {
		log.Println("collectPosts()")
		log.Fatalln(err)
	}

	template, err := compileTemplate()
	if err != nil {
		log.Println("compileTemplate()")
		log.Fatalln(err)
	}

	err = outputPosts(template, posts)
	if err != nil {
		log.Println("outputPosts()")
		log.Fatalln(err)
	}

	err = outputIndex(template, posts)
	if err != nil {
		log.Println("outputIndex()")
		log.Fatalln(err)
	}
}

func cleanOutput() error {
	err := os.RemoveAll("./output/")
	if err != nil {
		return err
	}
	return os.Mkdir("./output", 0777)
}

func collectPosts() (*[]post, error) {
	posts := []post{}
	dir, err := ioutil.ReadDir("./posts/src/")
	if err != nil {
		return nil, err
	}

	for _, f := range dir {
		if f.IsDir() {
			base := "./posts/src/" + f.Name() + "/"
			b, err := ioutil.ReadFile(base + "index.json")
			if err != nil {
				log.Println(err)
				log.Println("Skipping post folder")
				continue
			}

			var p post
			err = json.Unmarshal(b, &p)
			if err != nil {
				log.Println(err)
				log.Println("Skipping post folder")
				continue
			}

			p.Folder = f.Name()

			t := time.Unix(p.Created, 0)
			p.CreatedDisplay = t.Format("Jan 02, 2006")

			pb, err := ioutil.ReadFile(base + "post.md")
			if err != nil {
				log.Println(err)
				log.Println("Skipping post folder")
				continue
			}

			//pc := string(blackfriday.Run(pb))
			pc := string(blackfriday.Run(pb, blackfriday.WithRenderer(bfchroma.NewRenderer())))
			pc = strings.ReplaceAll(pc, `src="resource/`, `src="/posts/`+p.Folder+`/resource/`)

			p.Content = template.HTML(pc)

			posts = append(posts, p)
		}
	}

	return &posts, nil
}

func compileTemplate() (*template.Template, error) {
	b, err := ioutil.ReadFile("./posts/shell.tmpl")
	if err != nil {
		return nil, err
	}

	return template.New("posts").Parse(string(b))
}

func outputIndex(template *template.Template, posts *[]post) error {
	f, err := os.Create("./output/index.html")
	if err != nil {
		return err
	}
	defer f.Close()

	w := bufio.NewWriter(f)

	s := shell{
		Posts: posts,
		Index: posts,
	}

	err = template.Execute(w, s)
	if err != nil {
		return err
	}

	return w.Flush()
}

func outputPosts(template *template.Template, posts *[]post) error {
	for _, p := range *posts {
		if _, err := os.Stat("./posts/src/" + p.Folder + "/resource"); !os.IsNotExist(err) {
			err := copy.Copy("./posts/src/"+p.Folder+"/resource", "./output/posts/"+p.Folder+"/resource")
			if err != nil {
				return err
			}
		}

		f, err := os.Create("./output/posts/" + p.Folder + "/index.html")
		if err != nil {
			log.Println("OH NO")
			return err
		}
		defer f.Close()

		w := bufio.NewWriter(f)

		ps := []post{p}

		s := shell{
			Posts: &ps,
			Index: posts,
		}

		err = template.Execute(w, s)
		if err != nil {
			return err
		}

		err = w.Flush()
		if err != nil {
			return err
		}
	}

	return nil
}

func copyStatic() error {
	return copy.Copy("./posts/static", "./output")
}
