defmodule BsWeb.GameController do
  alias BsRepo.GameForm

  import Ecto.Query
  import Ecto.Changeset

  use BsWeb, :controller

  def index(conn, _params) do
    games = BsRepo.all(from(g in GameForm, order_by: [desc: g.id]))
    render(conn, "index.html", games: games)
  end

  def new(conn, _params) do
    changeset = GameForm.changeset(%GameForm{})

    render(conn, "new.html", changeset: changeset)
  end

  def create(conn, %{"game_form" => params}) do
    changeset =
      %GameForm{}
      |> GameForm.changeset(params)

    case changeset.valid? do
      true ->
        {:ok, game_form} = BsRepo.insert(changeset)
        redirect(conn, to: game_path(conn, :edit, game_form))

      _ ->
        msg =
          traverse_errors(changeset, fn {msg, opts} ->
            Enum.reduce(opts, msg, fn {key, value}, acc ->
              String.replace(acc, "%{#{key}}", to_string(value))
            end)
          end)

        msg =
          case msg do
            %{snakes: rest} ->
              rest
              |> Enum.flat_map(fn x -> Map.values(x) end)
          end

        conn
        |> put_flash(:info, msg)
        |> render("new.html", changeset: changeset)
    end
  end

  def show(conn, %{"id" => id}) do
    game_form = BsRepo.get!(GameForm, id)
    render(conn, "show.html", game: game_form)
  end

  def edit(conn, %{"id" => id}) do
    game_form = BsRepo.get!(GameForm, id)
    changeset = GameForm.changeset(game_form)
    render(conn, "edit.html", game: game_form, changeset: changeset)
  end

  def update(conn, %{"id" => id, "game_form" => params}) do
    game_form = BsRepo.get!(GameForm, id)

    changeset = GameForm.changeset(game_form, params)

    case changeset.valid? do
      true ->
        {:ok, game_form} = BsRepo.update(changeset)
        redirect(conn, to: game_path(conn, :edit, game_form))

      _ ->
        msg =
          traverse_errors(changeset, fn {msg, opts} ->
            Enum.reduce(opts, msg, fn {key, value}, acc ->
              String.replace(acc, "%{#{key}}", to_string(value))
            end)
          end)

        msg =
          case msg do
            %{snakes: rest} ->
              rest
              |> Enum.flat_map(fn x -> Map.values(x) end)
          end

        conn
        |> put_flash(:info, msg)
        |> render("edit.html", game: game_form, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    case BsRepo.get(GameForm, id) do
      nil -> :ok
      x -> BsRepo.delete(x)
    end

    index(conn, {})
  end

  def create_params(params) do
    %GameForm{
      width: String.to_integer(params["width"]),
      height: String.to_integer(params["height"])
    }
  end

  def update_params(_params) do
    %GameForm{}
  end
end
